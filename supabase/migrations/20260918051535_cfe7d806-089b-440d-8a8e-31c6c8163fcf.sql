UPDATE public.market_listings
   SET advertiser_type = 'unknown'
 WHERE advertiser_type = 'agency'
   AND agency_name IS NULL
   AND (
     source IN ('komo', 'yad2', 'קומו', 'יד2')
     OR source_site IN ('קומו', 'יד2')
   );