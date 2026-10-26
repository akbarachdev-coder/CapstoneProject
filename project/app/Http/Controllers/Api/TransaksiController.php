<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\Transaksi\StoreTransaksiRequest;
use App\Http\Requests\Transaksi\UpdateTransaksiRequest;
use App\Http\Requests\Transaksi\UpdateTransaksiStatusRequest;
use App\Http\Resources\TransaksiResource;
use App\Models\Pembayaran;
use App\Models\Transaksi;
use App\Support\AuditLogger;
use App\Support\TransaksiDetailBuilder;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class TransaksiController extends ApiController
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $validated = $request->validate([
            'status' => ['nullable', 'string', Rule::in([
                Transaksi::STATUS_PENDING,
                Transaksi::STATUS_DIBAYAR,
                Transaksi::STATUS_DIBATALKAN,
            ])],
            'id_kasir' => ['nullable', 'integer', 'exists:kasir,id_kasir'],
            'id_pelanggan' => ['nullable', 'integer', 'exists:pelanggan,id_pelanggan'],
            'dari' => ['nullable', 'date'],
            'sampai' => ['nullable', 'date', Rule::when($request->filled('dari'), ['after_or_equal:dari'])],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $user = $request->user();

        $query = Transaksi::query()
            ->with(['kasir', 'pelanggan', 'details.menu', 'pembayaran'])
            ->when($validated['status'] ?? null, fn ($query, string $status) => $query->where('status', $status))
            ->when($validated['id_pelanggan'] ?? null, fn ($query, int $id) => $query->where('id_pelanggan', $id))
            ->when($validated['dari'] ?? null, fn ($query, string $date) => $query->where('tanggal', '>=', Carbon::parse($date)->startOfDay()))
            ->when($validated['sampai'] ?? null, fn ($query, string $date) => $query->where('tanggal', '<=', Carbon::parse($date)->endOfDay()));

        if ($user->isAdmin()) {
            $query->when($validated['id_kasir'] ?? null, fn ($query, int $id) => $query->where('id_kasir', $id));
        } else {
            if (! $user->id_kasir) {
                abort(403, 'Akun kasir belum terhubung ke data kasir.');
            }

            $query->where(function ($query) use ($user) {
                $query->where('id_kasir', $user->id_kasir)
                    ->orWhereNull('id_kasir');
            });
        }

        return TransaksiResource::collection(
            $query->orderByDesc('tanggal')->paginate($validated['per_page'] ?? 15)->withQueryString()
        );
    }

    public function store(StoreTransaksiRequest $request): JsonResponse
    {
        $data = $request->validated();
        $idKasir = $this->resolveKasirId($request, $data['id_kasir'] ?? null);

        $transaksi = DB::transaction(function () use ($data, $idKasir) {
            [$details, $total] = $this->buildDetails($data['items']);

            $transaksi = Transaksi::create([
                'id_kasir' => $idKasir,
                'id_pelanggan' => $data['id_pelanggan'] ?? null,
                'tanggal' => isset($data['tanggal']) ? Carbon::parse($data['tanggal']) : now(),
                'total' => $total,
                'status' => Transaksi::STATUS_PENDING,
            ]);

            $transaksi->details()->createMany($details);

            return $transaksi;
        });

        $transaksi->load(['kasir', 'pelanggan', 'details.menu', 'pembayaran']);

        AuditLogger::log('transaksi.created', 'transaksi', $transaksi->id_transaksi, [
            'id_kasir' => $idKasir,
            'total' => $transaksi->total,
            'jumlah_item' => count($data['items']),
        ]);

        return (new TransaksiResource($transaksi))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Request $request, Transaksi $transaksi): TransaksiResource
    {
        $this->ensureCanAccessTransaksi($request, $transaksi);

        $transaksi->load(['kasir', 'pelanggan', 'details.menu', 'pembayaran']);

        return new TransaksiResource($transaksi);
    }

    public function update(UpdateTransaksiRequest $request, Transaksi $transaksi): TransaksiResource
    {
        $this->ensureCanAccessTransaksi($request, $transaksi);

        $data = $request->validated();

        $transaksi = DB::transaction(function () use ($transaksi, $data) {
            $locked = Transaksi::whereKey($transaksi->id_transaksi)->lockForUpdate()->firstOrFail();

            if ($locked->status !== Transaksi::STATUS_PENDING) {
                abort(409, 'Hanya transaksi berstatus pending yang dapat diubah.');
            }

            if ($locked->pembayaran()->exists()) {
                abort(409, 'Transaksi yang sudah memiliki pembayaran tidak dapat diubah.');
            }

            $attributes = [];

            if (array_key_exists('id_pelanggan', $data)) {
                $attributes['id_pelanggan'] = $data['id_pelanggan'];
            }

            if (array_key_exists('tanggal', $data)) {
                $attributes['tanggal'] = Carbon::parse($data['tanggal']);
            }

            if (array_key_exists('items', $data)) {
                [$details, $total] = $this->buildDetails($data['items']);

                $locked->details()->delete();
                $locked->details()->createMany($details);
                $attributes['total'] = $total;
            }

            $locked->update($attributes);

            return $locked;
        });

        $transaksi->load(['kasir', 'pelanggan', 'details.menu', 'pembayaran']);

        AuditLogger::log('transaksi.updated', 'transaksi', $transaksi->id_transaksi, [
            'total' => $transaksi->total,
        ]);

        return new TransaksiResource($transaksi);
    }

    public function updateStatus(UpdateTransaksiStatusRequest $request, Transaksi $transaksi): TransaksiResource
    {
        $status = $request->validated('status');

        $transaksi = DB::transaction(function () use ($transaksi, $status) {
            $locked = Transaksi::whereKey($transaksi->id_transaksi)->lockForUpdate()->firstOrFail();

            if ($locked->status === Transaksi::STATUS_DIBATALKAN) {
                abort(409, 'Transaksi yang sudah dibatalkan tidak dapat diubah statusnya.');
            }

            $paid = (float) $locked->pembayaran()
                ->whereIn('status_pembayaran', [Pembayaran::STATUS_SEBAGIAN, Pembayaran::STATUS_LUNAS])
                ->sum('jumlah_bayar');

            if ($status === Transaksi::STATUS_DIBATALKAN && $paid > 0) {
                abort(409, 'Transaksi yang sudah memiliki pembayaran tidak dapat dibatalkan.');
            }

            if ($status === Transaksi::STATUS_DIBAYAR && $paid + 0.001 < (float) $locked->total) {
                abort(409, 'Transaksi belum lunas. Catat pembayaran terlebih dahulu.');
            }

            if ($status === Transaksi::STATUS_PENDING && $paid > 0) {
                abort(409, 'Transaksi yang sudah memiliki pembayaran tidak dapat dikembalikan ke pending.');
            }

            $locked->update(['status' => $status]);

            return $locked;
        });

        $transaksi->load(['kasir', 'pelanggan', 'details.menu', 'pembayaran']);

        AuditLogger::log('transaksi.status_changed', 'transaksi', $transaksi->id_transaksi, [
            'status' => $status,
        ]);

        return new TransaksiResource($transaksi);
    }

    public function destroy(Request $request, Transaksi $transaksi): JsonResponse
    {
        DB::transaction(function () use ($transaksi) {
            $locked = Transaksi::whereKey($transaksi->id_transaksi)->lockForUpdate()->firstOrFail();

            if ($locked->status !== Transaksi::STATUS_PENDING) {
                abort(409, 'Hanya transaksi berstatus pending yang dapat dihapus.');
            }

            if ($locked->pembayaran()->exists()) {
                abort(409, 'Transaksi yang sudah memiliki pembayaran tidak dapat dihapus.');
            }

            $locked->details()->delete();
            $locked->delete();
        });

        AuditLogger::log('transaksi.deleted', 'transaksi', $transaksi->id_transaksi);

        return response()->json([
            'message' => 'Transaksi berhasil dihapus.',
        ]);
    }

    private function resolveKasirId(Request $request, ?int $requestedKasirId): int
    {
        $user = $request->user();

        if ($user->isAdmin()) {
            $idKasir = $requestedKasirId ?? $user->id_kasir;

            if (! $idKasir) {
                throw ValidationException::withMessages([
                    'id_kasir' => ['Kasir wajib dipilih untuk transaksi ini.'],
                ]);
            }

            return (int) $idKasir;
        }

        if (! $user->id_kasir) {
            abort(403, 'Akun kasir belum terhubung ke data kasir.');
        }

        return (int) $user->id_kasir;
    }

    private function buildDetails(array $items): array
    {
        return TransaksiDetailBuilder::build($items);
    }
}
