<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Requests\Kyc\StoreKycRequest;
use App\Models\CustomerKyc;
use App\Services\KycService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;

class KycController extends Controller
{
    public function __construct(private readonly KycService $kycService)
    {
    }

    public function index(Request $request): JsonResponse
    {
        return response()->json($this->kycService->paginate($request->all()));
    }

    public function store(StoreKycRequest $request): JsonResponse
    {
        $payload = $this->preparePayload($request);

        return response()->json([
            'message' => 'KYC saved successfully.',
            'data' => $this->kycService->create($payload),
        ], 201);
    }

    public function show(int $id): JsonResponse
    {
        return response()->json([
            'data' => CustomerKyc::query()->with(['customer'])->findOrFail($id),
        ]);
    }

    public function update(StoreKycRequest $request, int $id): JsonResponse
    {
        $kyc = CustomerKyc::query()->findOrFail($id);
        $kyc->update($this->preparePayload($request, $kyc));

        return response()->json([
            'message' => 'KYC updated successfully.',
            'data' => $kyc->fresh(['customer']),
        ]);
    }

    public function destroy(int $id): JsonResponse
    {
        CustomerKyc::query()->findOrFail($id)->delete();

        return response()->json([
            'message' => 'KYC deleted successfully.',
        ]);
    }

    private function preparePayload(StoreKycRequest $request, ?CustomerKyc $existingKyc = null): array
    {
        $validated = $request->validated();
        $customerId = (int) $validated['customer_id'];
        $currentKyc = $existingKyc ?: CustomerKyc::query()->where('customer_id', $customerId)->first();

        $validated['photo'] = $this->storeKycFile(
            $request->file('photo'),
            $validated['existing_photo'] ?? null,
            $currentKyc?->photo,
            $customerId,
            'photo'
        );
        $validated['aadhaar_file'] = $this->storeKycFile(
            $request->file('aadhaar_file'),
            $validated['existing_aadhaar_file'] ?? null,
            $currentKyc?->aadhaar_file,
            $customerId,
            'aadhaar'
        );
        $validated['pan_file'] = $this->storeKycFile(
            $request->file('pan_file'),
            $validated['existing_pan_file'] ?? null,
            $currentKyc?->pan_file,
            $customerId,
            'pan'
        );

        unset(
            $validated['existing_photo'],
            $validated['existing_aadhaar_file'],
            $validated['existing_pan_file']
        );

        return $validated;
    }

    private function storeKycFile(
        ?UploadedFile $file,
        ?string $existingPath,
        ?string $currentPath,
        int $customerId,
        string $folder
    ): ?string {
        if (! $file) {
            return $existingPath ?: $currentPath;
        }

        if ($currentPath && $currentPath !== $existingPath) {
            $this->deletePublicFile($currentPath);
        }

        if ($existingPath && $existingPath !== $currentPath) {
            $this->deletePublicFile($existingPath);
        }

        $path = $file->store("kyc/customer-{$customerId}/{$folder}", 'public');

        return "/storage/{$path}";
    }

    private function deletePublicFile(?string $path): void
    {
        if (! $path) {
            return;
        }

        $relativePath = ltrim(preg_replace('#^/storage/#', '', $path) ?? '', '/');

        if ($relativePath !== '') {
            Storage::disk('public')->delete($relativePath);
        }
    }
}
