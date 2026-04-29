import EditMetalMasterPage from '@views/metal-rates/EditMetalMasterPage'

const MetalRatesMasterViewPage = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params
  return <EditMetalMasterPage id={id} isView={true} />
}

export default MetalRatesMasterViewPage
