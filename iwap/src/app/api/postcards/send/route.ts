import { NextRequest, NextResponse } from "next/server";
// import { Writable } from "stream"; // No longer needed
// import formidable from "formidable"; // No longer needed

// Disable the default body parser - no longer needed with NextRequest/NextResponse and req.formData()
// export const config = {
//   api: {
//     bodyParser: false,
//   },
// };

// Helper to convert a Web API File object to a Buffer
const fileToBuffer = async (file: File): Promise<Buffer> => {
  const arrayBuffer = await file.arrayBuffer();
  return Buffer.from(arrayBuffer);
};

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const data: { [key: string]: any } = {};

    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        // If you need to process the file content, you can convert it to a Buffer
        // const fileBuffer = await fileToBuffer(value);
        data[key] = {
          name: value.name,
          type: value.type,
          size: value.size,
          // bufferLength: fileBuffer.length // Example of using the buffer
        };
      } else {
        data[key] = value;
      }
    }

    console.log("Received postcard data on the backend:");
    console.log(JSON.stringify(data, null, 2));

    // You can access files like this:
    const frontPng = formData.get("frontCard"); // Changed from frontPng to frontCard as per form data append in page.tsx
    const backPng = formData.get("backCard"); // Changed from backPng to backCard
    const frontVideo = formData.get("frontVideo"); // Changed from frontMp4 to frontVideo
    const backVideo = formData.get("backVideo"); // Changed from backMp4 to backVideo

    if (frontPng instanceof File) {
      const frontPngBuffer = await fileToBuffer(frontPng);
      console.log(`Received front PNG: ${frontPng.name} (${frontPngBuffer.length} bytes)`);
    }
     if (backPng instanceof File) {
      const backPngBuffer = await fileToBuffer(backPng);
      console.log(`Received back PNG: ${backPng.name} (${backPngBuffer.length} bytes)`);
    }
    if (frontVideo instanceof File) {
        const frontVideoBuffer = await fileToBuffer(frontVideo);
        console.log(`Received front Video: ${frontVideo.name} (${frontVideoBuffer.length} bytes)`);
    }
    if (backVideo instanceof File) {
        const backVideoBuffer = await fileToBuffer(backVideo);
        console.log(`Received back Video: ${backVideo.name} (${backVideoBuffer.length} bytes)`);
    }


    return NextResponse.json(
      {
        message: "Postcard data received successfully.",
        data,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error processing postcard send request:", error);
    return NextResponse.json(
      { error: "Failed to process request." },
      { status: 500 }
    );
  }
}
