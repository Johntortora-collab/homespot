// Single source of truth for the shape of a spot photo.
//
// The owner frames their photo to a ratio in the crop editor, and every surface
// that renders it — Main Street, the spot page, the draft preview, the demo —
// uses the same one. If those two ever disagree, the browser crops a second
// time on top of the owner's framing and cuts off whatever they centred.
//
// The shape is stored per spot on spots.photo_aspect, because businesses don't
// all have the same kind of image. A storefront wants width. A logo is square
// and looks wrong letterboxed. A menu board is tall. Three named options rather
// than a free ratio: it's a choice an owner can make in two seconds, and it
// can't produce a listing that breaks the feed.

export const PHOTO_SHAPES = [
  { key: 'wide',   label: 'Wide',   ratio: 16 / 9, hint: 'Storefront, counter, interior' },
  { key: 'square', label: 'Square', ratio: 1,      hint: 'Logo, or one dish' },
  { key: 'tall',   label: 'Tall',   ratio: 4 / 5,  hint: 'Menu board, vertical sign' },
]

// What every existing spot has, and what the column defaults to. Changing this
// would silently re-crop every listing that never picked a shape, so don't.
export const DEFAULT_PHOTO_SHAPE = 'wide'

const BY_KEY = Object.fromEntries(PHOTO_SHAPES.map(s => [s.key, s]))

/**
 * Ratio for a stored shape key. Anything unrecognised — null from a row
 * written before this column existed, or a value from a newer client — falls
 * back to wide rather than rendering at 0 and collapsing the image.
 */
export function photoAspect(shape) {
  return (BY_KEY[shape] || BY_KEY[DEFAULT_PHOTO_SHAPE]).ratio
}

/** Ratio for a spot row, wherever it came from. */
export function spotPhotoAspect(spot) {
  return photoAspect(spot?.photo_aspect)
}

export function photoShapeLabel(shape) {
  return (BY_KEY[shape] || BY_KEY[DEFAULT_PHOTO_SHAPE]).label
}

// Kept so older imports keep resolving. New code should ask for a spot's own
// shape instead of assuming this one.
export const PHOTO_ASPECT = photoAspect(DEFAULT_PHOTO_SHAPE)
