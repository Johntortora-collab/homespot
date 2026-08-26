-- 020_spot_photo_crop.sql
-- Adds re-editable photo framing to spots.
--
-- photo_url          (existing) the CROPPED cover customers actually download
-- photo_original_url (new)      the uncropped upload, owner-facing only
-- photo_crop         (new)      {"x":0.5,"y":0.42,"zoom":1.35}
--
-- x / y  = the point of the original image sitting at the centre of the frame,
--          expressed 0-1 so it stays correct if the display ratio ever changes.
-- zoom   = 1 means the image exactly covers the frame.
--
-- No change to spots_with_stamps is needed: the consumer app only ever reads
-- photo_url, which already exists. These two columns are read by the owner
-- dashboard, which selects from the spots table directly.

alter table public.spots
  add column if not exists photo_original_url text,
  add column if not exists photo_crop         jsonb;

-- Reject malformed crop objects rather than letting a bad write through and
-- discovering it when the editor opens to a blank frame.
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
      and (photo_crop ->> 'zoom')::numeric between 1 and 8
    )
  );

comment on column public.spots.photo_original_url is
  'Uncropped upload. Owner-facing only, so the crop can be re-adjusted later.';
comment on column public.spots.photo_crop is
  'Framing of photo_original_url used to produce photo_url. {x,y,zoom}.';
