<?php

namespace App\Http\Controllers\API;

use App\Models\Product;
use Illuminate\Database\Eloquent\Model;

class ProductController extends CrudController
{
    protected string $modelClass = Product::class;

    protected array $relations = ['company'];

    protected array $filterable = ['company_id', 'category'];

    protected array $sortable = ['id', 'name', 'category', 'price', 'created_at', 'updated_at'];

    protected function rules(?Model $model = null): array
    {
        return [
            'company_id' => ['required', 'integer', 'exists:companies,id'],
            'name' => ['required', 'string', 'max:255'],
            'category' => ['required', 'string', 'max:255'],
            'price' => ['required', 'numeric', 'min:0'],
            'image' => ['nullable', 'string', 'max:255'],
        ];
    }

    protected function applySearch($query, string $search): void
    {
        $query->where(function ($builder) use ($search) {
            $builder->where('name', 'like', "%{$search}%")
                ->orWhere('category', 'like', "%{$search}%");
        });
    }
}
