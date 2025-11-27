import { NextRequest, NextResponse } from "next/server";
import { Writable } from "stream";
import formidable from "formidable";

// Disable the default body parser
export const config = {
  api: {
    bodyParser: false,
  },
};

// Helper to write file to a temporary path (in-memory or on disk)
const writeFile = async (
  stream: Writable,
  file: formidable.File
): Promise<string> => {
  const chunks = [];
  for await (const chunk of file) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  const buffer = Buffer.concat(chunks);
  // For now, we don't save the file, just confirm we received it.
  // In a real scenario, you'd save it like this:
  // const filePath = `/tmp/${file.newFilename}`;
  // await fs.promises.writeFile(filePath, buffer);
  // return filePath;
  return `Received ${file.originalFilename} (${buffer.length} bytes)`;
};

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const data: { [key: string]: any } = {};

    for (const [key, value] of formData.entries()) {
      if (value instanceof File) {
        data[key] = {
          name: value.name,
          type: value.type,
          size: value.size,
        };
      } else {
        data[key] = value;
      }
    }

    console.log("Received postcard data on the backend:");
    console.log(JSON.stringify(data, null, 2));

    // You can access files like this:
    const frontPng = formData.get("frontPng");
    const backPng = formData.get("backPng");
    const frontMp4 = formData.get("frontMp4");
    const backMp4 = formData.get("backMp4");

    if (frontPng instanceof File) {
      console.log(`Received front PNG: ${frontPng.name} (${frontPng.size} bytes)`);
    }
     if (backPng instanceof File) {
      console.log(`Received back PNG: ${backPng.name} (${backPng.size} bytes)`);
    }
    if (frontMp4 instanceof File) {
        console.log(`Received front MP4: ${frontMp4.name} (${frontMp4.size} bytes)`);
    }
    if (backMp4 instanceof File) {
        console.log(`Received back MP4: ${backMp4.name} (${backMp4.size} bytes)`);
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
