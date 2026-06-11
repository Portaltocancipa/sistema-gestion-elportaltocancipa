import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

export function useRealtime(table, callback) {
  const cbRef = useRef(callback)
  cbRef.current = callback

  useEffect(() => {
    const channel = supabase
      .channel(`rt-${table}-${Date.now()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table }, () => cbRef.current())
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [table])
}
