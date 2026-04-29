import EditMetalMasterPage from '@views/metal-rates/EditMetalMasterPage'

const MetalRatesMasterEditPage = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  return <EditMetalMasterPage id={id} />
}

export default MetalRatesMasterEditPage
