<?php

namespace Database\Seeders;

use App\Models\Product;
use Illuminate\Database\Seeder;

class ProductSeeder extends Seeder
{
    public function run(): void
    {
        // Real gold-jewellery photos from Unsplash (free license, no attribution
        // required — https://unsplash.com/license). Each photo ID below was found
        // via live Unsplash search results and verified to resolve before use.
        // Demo content only — swap for real product photography via Product
        // Master > Edit before going live.
        $products = [
            ['name' => 'Antique Gold Necklace Set', 'category' => 'Necklace', 'price' => 145800, 'photo' => '1601121141461-9d6647bca1ed'],
            ['name' => 'Classic Gold Bangles (Pair)', 'category' => 'Bangles', 'price' => 128900, 'photo' => '1611107683227-e9060eccd846'],
            ['name' => 'Solitaire Gold Ring', 'category' => 'Ring', 'price' => 28500, 'photo' => '1622398925373-3f91b1e275f5'],
            ['name' => 'Temple Design Gold Earrings', 'category' => 'Earrings', 'price' => 52000, 'photo' => '1693212793204-bcea856c75fe'],
            ['name' => 'Diamond Accent Pendant', 'category' => 'Pendant', 'price' => 88000, 'photo' => '1651160670627-2896ddf7822f'],
            ['name' => '22K Gold Chain', 'category' => 'Chain', 'price' => 96500, 'photo' => '1602173574767-37ac01994b2a'],
            ['name' => 'Elegant Gold Bracelet', 'category' => 'Bracelet', 'price' => 64200, 'photo' => '1598560917807-1bae44bd2be8'],
            ['name' => 'Traditional Gold Anklet (Pair)', 'category' => 'Anklet', 'price' => 41800, 'photo' => '1722410180687-b05b50922362'],
            ['name' => 'Gold Mangalsutra', 'category' => 'Mangalsutra', 'price' => 73500, 'photo' => '1620656798579-1984d9e87df7'],
            ['name' => 'Floral Gold Nose Pin', 'category' => 'Nose Pin', 'price' => 12500, 'photo' => '1601121141461-920cb1993441'],
        ];

        foreach ($products as $product) {
            // updateOrCreate (not firstOrCreate) so re-running this seeder backfills
            // the image on rows that were already seeded before images existed.
            Product::query()->updateOrCreate(
                ['name' => $product['name']],
                [
                    'category' => $product['category'],
                    'price' => $product['price'],
                    'image' => $this->unsplashPhotoUrl($product['photo']),
                ]
            );
        }
    }

    private function unsplashPhotoUrl(string $photoId): string
    {
        return "https://images.unsplash.com/photo-{$photoId}?w=600&h=440&fit=crop&auto=format&q=80";
    }
}
