import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { MapPin, Search, Loader2, X } from "lucide-react";
import { invokeEdgeFunction } from "@/lib/edgeFunctions";

interface AddressResult {
  place_name: string;
  address_name: string;
  road_address_name: string;
  lat: number;
  lng: number;
  category: string;
  phone: string;
}

interface KakaoAddressSearchProps {
  value: string;
  onSelect: (result: {
    location: string;
    location_address: string;
    location_lat: number;
    location_lng: number;
  }) => void;
  placeholder?: string;
}

export const KakaoAddressSearch = ({
  value,
  onSelect,
  placeholder = "장소 또는 주소 검색",
}: KakaoAddressSearchProps) => {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<AddressResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    setQuery(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const searchAddress = async (searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await invokeEdgeFunction("kakao-address-search", {
        body: { query: searchQuery.trim(), size: 5 },
      });

      if (error) throw error;
      setResults(data?.results || []);
      setOpen((data?.results || []).length > 0);
    } catch (e) {
      console.error("Address search error:", e);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (val: string) => {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchAddress(val), 400);
  };

  const handleSelect = (result: AddressResult) => {
    setQuery(result.place_name);
    setOpen(false);
    onSelect({
      location: result.place_name,
      location_address: result.road_address_name || result.address_name,
      location_lat: result.lat,
      location_lng: result.lng,
    });
  };

  const handleClear = () => {
    setQuery("");
    setResults([]);
    setOpen(false);
    onSelect({ location: "", location_address: "", location_lat: 0, location_lng: 0 });
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder={placeholder}
          className="pl-8 pr-8"
          onFocus={() => results.length > 0 && setOpen(true)}
        />
        {loading && (
          <Loader2 className="absolute right-8 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-muted-foreground" />
        )}
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg overflow-hidden max-h-[240px] overflow-y-auto">
          {results.map((r, i) => (
            <button
              key={i}
              type="button"
              className="w-full text-left px-3 py-2.5 hover:bg-accent transition-colors border-b border-border/50 last:border-0"
              onClick={() => handleSelect(r)}
            >
              <div className="flex items-start gap-2">
                <MapPin className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{r.place_name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {r.road_address_name || r.address_name}
                  </p>
                  {r.category && (
                    <p className="text-[10px] text-muted-foreground/70">{r.category}</p>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
