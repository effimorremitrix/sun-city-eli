CREATE OR REPLACE FUNCTION public.get_public_site(p_slug text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'slug', s.slug,
    'name', s.name,
    'business', COALESCE(c.business, '{}'::jsonb),
    'texts', COALESCE(c.texts, '{}'::jsonb),
    'hours', COALESCE(c.hours, '[]'::jsonb),
    'images', COALESCE(c.images, '{}'::jsonb),
    'settings', COALESCE(c.settings, '{}'::jsonb),
    'updated_at', GREATEST(
      COALESCE(c.updated_at, s.updated_at),
      COALESCE((SELECT max(i.updated_at) FROM public.site_items i WHERE i.site_id = s.id AND i.is_active), s.updated_at)
    ),
    'items', COALESCE((
      SELECT jsonb_agg(jsonb_build_object(
        'id', i.id, 'kind', i.kind, 'title', i.title, 'description', i.description,
        'price', i.price, 'price_note', i.price_note, 'image_url', i.image_url,
        'sort_order', i.sort_order, 'updated_at', i.updated_at
      ) ORDER BY i.sort_order, i.created_at)
      FROM public.site_items i WHERE i.site_id = s.id AND i.is_active
    ), '[]'::jsonb)
  )
  FROM public.sites s
  LEFT JOIN public.site_content c ON c.site_id = s.id
  WHERE s.slug = p_slug
$$;