'use client'
import { useEffect } from 'react'

export default function OwnerRedirect() {
  useEffect(() => { window.location.replace('/login') }, [])
  return null
}
