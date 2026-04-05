<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\AppSetting;
use App\Models\Company;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class SettingController extends Controller
{
    private const ALLOWED_SECTIONS = [
        'company-profile',
        'payment-gateway',
        'sms-gateway',
        'whatsapp-api',
        'notifications',
        'general-settings',
    ];

    public function show(Request $request, string $section): JsonResponse
    {
        $this->validateSection($section);

        $companyId = $request->user()?->company_id;
        $key = $this->toSettingKey($section);

        $setting = AppSetting::query()
            ->where('company_id', $companyId)
            ->where('key', $key)
            ->first();

        return response()->json([
            'data' => [
                'section' => $section,
                'value' => $setting?->value ?? [],
            ],
        ]);
    }

    public function update(Request $request, string $section): JsonResponse
    {
        $this->validateSection($section);

        $validated = $request->validate([
            'value' => ['required', 'array'],
        ]);

        $companyId = $request->user()?->company_id;
        $key = $this->toSettingKey($section);

        $setting = AppSetting::query()->updateOrCreate(
            [
                'company_id' => $companyId,
                'key' => $key,
            ],
            [
                'value' => $validated['value'],
            ]
        );

        return response()->json([
            'message' => 'Settings updated successfully.',
            'data' => [
                'section' => $section,
                'value' => $setting->value ?? [],
            ],
        ]);
    }

    public function uploadCompanyLogo(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'logo' => ['required', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
        ]);

        $path = $validated['logo']->store('company-logos', 'public');
        $publicPath = "/storage/{$path}";

        $companyId = $request->user()?->company_id;

        if ($companyId) {
            Company::query()->whereKey($companyId)->update([
                'logo' => $publicPath,
            ]);
        }

        return response()->json([
            'message' => 'Logo uploaded successfully.',
            'data' => [
                'logo' => $publicPath,
            ],
        ]);
    }

    private function validateSection(string $section): void
    {
        validator(
            ['section' => $section],
            ['section' => ['required', 'string', Rule::in(self::ALLOWED_SECTIONS)]]
        )->validate();
    }

    private function toSettingKey(string $section): string
    {
        return "settings.{$section}";
    }
}
