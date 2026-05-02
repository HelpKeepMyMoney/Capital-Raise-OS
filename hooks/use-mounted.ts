import * as React from "react"

/** True after mount — use to avoid SSR/client mismatches for locale, “now”, or timezone-sensitive UI. */
export function useMounted(): boolean {
  const [mounted, setMounted] = React.useState(false)
  React.useEffect(() => {
    setMounted(true)
  }, [])
  return mounted
}
