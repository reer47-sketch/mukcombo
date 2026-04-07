'use client'
import { useEffect } from 'react'

export default function OwnerDashboardRedirect() {
  useEffect(() => { window.location.replace('/dashboard') }, [])
  return null
}
