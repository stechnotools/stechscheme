import EditProductPage from '@views/products/EditProductPage'

const ProductEditRoutePage = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params

  return <EditProductPage productId={Number(id)} />
}

export default ProductEditRoutePage
