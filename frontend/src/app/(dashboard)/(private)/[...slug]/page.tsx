// MUI Imports
import Card from '@mui/material/Card'
import CardContent from '@mui/material/CardContent'
import Typography from '@mui/material/Typography'

type Props = {
  params: Promise<{ slug: string[] }>
}

const PlaceholderModulePage = async ({ params }: Props) => {
  const resolvedParams = await params
  const title = resolvedParams.slug.join(' / ')

  return (
    <Card>
      <CardContent>
        <Typography variant='h4' className='mb-2 capitalize'>
          {title}
        </Typography>
        <Typography color='text.secondary'>
          This module route is ready for implementation. Connect the final screen UI and API actions here.
        </Typography>
      </CardContent>
    </Card>
  )
}

export default PlaceholderModulePage
