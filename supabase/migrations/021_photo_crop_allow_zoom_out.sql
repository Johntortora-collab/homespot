-- 021_photo_crop_allow_zoom_out.sql
-- 020 assumed zoom >= 1 (image always fills the frame). The editor now allows
-- zooming out so the whole photo fits, which produces zoom values below 1.
-- Without this, saving a zoomed-out crop fails the check constraint.

alter table public.spots
  drop constraint if exists spots_photo_crop_shape;

alter table public.spots
  add constraint spots_photo_crop_shape check (
    photo_crop is null
    or (
      jsonb_typeof(photo_crop) = 'object'
      and jsonb_typeof(photo_crop -> 'x')    = 'number'
      and jsonb_typeof(photo_crop -> 'y')    = 'number'
      and jsonb_typeof(photo_crop -> 'zoom') = 'number'
      and (photo_crop ->> 'x')::numeric between 0 and 1
      and (photo_crop ->> 'y')::numeric between 0 and 1
      and (photo_crop ->> 'zoom')::numeric > 0
      and (photo_crop ->> 'zoom')::numeric <= 8
    )
  );
