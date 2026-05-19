'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import LoyaltyPointAddRedeemPage from '@views/loyalty-card/LoyaltyPointAddRedeemPage'
import LoyaltyPointAdjustmentListPage from '@views/loyalty-card/LoyaltyPointAdjustmentListPage'

function LoyaltyPointAdjustmentContent() {
  const searchParams = useSearchParams()
  const customerId = searchParams.get('customerId')
  
  const [view, setView] = useState<'list' | 'add' | 'edit'>('list')
  const [editVoucherNo, setEditVoucherNo] = useState<string | null>(null)

  useEffect(() => {
    if (customerId) {
      setView('add')
    }
  }, [customerId])

  if (view === 'add') {
    return <LoyaltyPointAddRedeemPage 
      onClose={() => setView('list')} 
      initialCustomerId={customerId || undefined}
    />
  }

  if (view === 'edit') {
    return <LoyaltyPointAddRedeemPage 
      onClose={() => {
        setView('list')
        setEditVoucherNo(null)
      }} 
      editVoucherNo={editVoucherNo || undefined}
    />
  }

  return <LoyaltyPointAdjustmentListPage 
    onAddNew={() => setView('add')} 
    onEdit={(voucherNo) => {
      setEditVoucherNo(voucherNo)
      setView('edit')
    }}
  />
}

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LoyaltyPointAdjustmentContent />
    </Suspense>
  )
}
