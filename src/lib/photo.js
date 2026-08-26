// Single source of truth for the shape of a spot photo.
//
// The owner frames their photo to this ratio in the crop editor, and the
// consumer app renders it at the same ratio. If these two ever disagree, the
// browser crops a second time on top of the owner's framing and cuts off
// whatever they carefully centred.
//
// Change it here and both sides follow. 16/9 is a good middle ground: wide
// enough to feel like a storefront banner, tall enough that a portrait shot
// doesn't lose its head.
export const PHOTO_ASPECT = 16 / 9
