<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class BlockBotRequests
{
    private const BLOCKED_PATHS = [
        'wp-admin', 'wp-login', 'wp-content', 'wp-includes', 'wp-json',
        'xmlrpc.php', 'wp-cron.php',
        'phpmyadmin', 'pma', 'adminer', 'mysql', 'manager',
        'cgi-bin', 'server-status', 'server-info',
        'actuator', 'console', '_ignition',
        '.env', '.git', '.svn', '.htaccess', '.htpasswd',
    ];

    private const BLOCKED_EXTENSIONS = [
        'php3', 'php4', 'php5', 'php7', 'phtml',
        'sh', 'bash', 'py', 'cgi', 'pl',
        'asp', 'aspx', 'jsp',
        'exe', 'bat', 'cmd', 'com',
    ];

    private const BLOCKED_AGENTS = [
        'sqlmap', 'nikto', 'nmap', 'masscan', 'zgrab',
        'dirbuster', 'gobuster', 'wfuzz', 'hydra', 'medusa',
        'nuclei', 'acunetix', 'nessus', 'burpsuite', 'qualys',
        'arachni', 'w3af', 'skipfish', 'zap', 'openvas',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        $path = $request->path();

        foreach (self::BLOCKED_PATHS as $blocked) {
            if (str_starts_with($path, $blocked)) {
                abort(444);
            }
        }

        $extension = strtolower(pathinfo($path, PATHINFO_EXTENSION));

        if (in_array($extension, self::BLOCKED_EXTENSIONS, true)) {
            abort(444);
        }

        $userAgent = $request->userAgent() ?? '';

        if ($userAgent === '') {
            abort(444);
        }

        foreach (self::BLOCKED_AGENTS as $bot) {
            if (stripos($userAgent, $bot) !== false) {
                abort(444);
            }
        }

        $query = $request->query();

        foreach ($query as $value) {
            if (preg_match('/(eval\(|union\s+select|concat\(|base64_encode|etc\/passwd|proc\/self)/i', (string) $value)) {
                abort(444);
            }
        }

        return $next($request);
    }
}
