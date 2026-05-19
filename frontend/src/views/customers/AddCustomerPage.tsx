'use client'

import { useRouter } from 'next/navigation'
import { CustomerAddForm } from './CustomerAddForm'

const AddCustomerPage = () => {
  const router = useRouter()

  return (
    <CustomerAddForm 
      onSuccess={() => router.push('/customers')} 
      onCancel={() => router.push('/customers')}
    />
  )
}

export default AddCustomerPage
