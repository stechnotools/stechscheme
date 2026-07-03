<?php

namespace App\Http\Controllers\API;

use App\Models\Product;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\UploadedFile;

class ProductController extends CrudController
{
    protected string $modelClass = Product::class;

    protected array $filterable = ['category'];

    protected array $sortable = ['id', 'name', 'category', 'price', 'created_at', 'updated_at'];

    protected function rules(?Model $model = null): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'category' => ['required', 'string', 'max:255'],
            'price' => ['required', 'numeric', 'min:0'],
            'image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
        ];
    }

    protected function mutateValidatedData(array $validated, ?Model $model): array
    {
        if (isset($validated['image']) && $validated['image'] instanceof UploadedFile) {
            $path = $validated['image']->store('products', 'public');
            $validated['image'] = "/storage/{$path}";
        }

        return $validated;
    }

    protected function applySearch($query, string $search): void
    {
        $query->where(function ($builder) use ($search) {
            $builder->where('name', 'like', "%{$search}%")
                ->orWhere('category', 'like', "%{$search}%");
        });
    }
}
