<?php

namespace App\Http\Controllers\Api;

use App\Http\Requests\Menu\StoreMenuRequest;
use App\Http\Requests\Menu\UpdateMenuRequest;
use App\Http\Resources\MenuResource;
use App\Models\Menu;
use App\Support\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class MenuController extends ApiController
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $validated = $request->validate([
            'search' => ['nullable', 'string', 'max:100'],
            'per_page' => ['nullable', 'integer', 'min:1', 'max:100'],
        ]);

        $menu = Menu::query()
            ->when($validated['search'] ?? null, function ($query, string $search) {
                $query->where('nama_menu', 'like', '%'.$search.'%');
            })
            ->orderBy('nama_menu')
            ->paginate($validated['per_page'] ?? 15)
            ->withQueryString();

        return MenuResource::collection($menu);
    }

    public function store(StoreMenuRequest $request): JsonResponse
    {
        $menu = Menu::create($request->validated());

        AuditLogger::log('menu.created', 'menu', $menu->id_menu);

        return (new MenuResource($menu))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Menu $menu): MenuResource
    {
        return new MenuResource($menu);
    }

    public function update(UpdateMenuRequest $request, Menu $menu): MenuResource
    {
        $menu->update($request->validated());

        AuditLogger::log('menu.updated', 'menu', $menu->id_menu);

        return new MenuResource($menu);
    }

    public function destroy(Menu $menu): JsonResponse
    {
        if ($menu->detailTransaksi()->exists()) {
            return response()->json([
                'message' => 'Menu tidak dapat dihapus karena sudah digunakan pada transaksi.',
            ], 409);
        }

        $id = $menu->id_menu;
        $menu->delete();

        AuditLogger::log('menu.deleted', 'menu', $id);

        return response()->json([
            'message' => 'Menu berhasil dihapus.',
        ]);
    }
}
