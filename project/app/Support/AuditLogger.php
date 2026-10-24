<?php

namespace App\Support;

use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

final class AuditLogger
{
    public static function log(string $action, string $entity, int|string|null $entityId = null, array $context = []): void
    {
        $request = request();
        $user = $request->user();

        Log::channel('audit')->info($action, [
            'action' => $action,
            'entity' => $entity,
            'entity_id' => $entityId,
            'actor_id' => $user?->id,
            'actor_role' => $user?->role,
            'ip' => $request->ip(),
            'user_agent' => Str::limit((string) $request->userAgent(), 255),
            'request_id' => $request->attributes->get('request_id'),
            'context' => $context,
        ]);
    }
}
