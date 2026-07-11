const MAX_EDGE = 1024;
const JPEG_QUALITY = 0.85;

export type PreparedImage = {
  dataUrl: string;
  previewUrl: string;
  label: string;
};

export async function prepareImageFile(file: File): Promise<PreparedImage> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Choose an image file");
  }
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();
  const dataUrl = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  return { dataUrl, previewUrl: dataUrl, label: file.name };
}

export function imageAttachEvent(dataUrl: string) {
  return {
    type: "conversation.item.create",
    item: {
      type: "message",
      role: "user",
      content: [{ type: "input_image", image_url: dataUrl }],
    },
  };
}