import { useEffect, useState } from "react";

const DEFAULT_QUERY = "(max-width: 768px)";

export function useIsMobile(query: string = DEFAULT_QUERY) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    const handleChange = () => setIsMobile(media.matches);
    handleChange();
    media.addEventListener("change", handleChange);
    return () => media.removeEventListener("change", handleChange);
  }, [query]);

  return isMobile;
}
