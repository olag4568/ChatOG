import { NextResponse } from "next/server";
import Replicate from "replicate";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  try {
    const token = process.env.REPLICATE_API_TOKEN;

    if (!token || !token.trim()) {
      return NextResponse.json(
        {
          error:
            "Image generation is not configured yet. Add REPLICATE_API_TOKEN to your server-side .env.local file.",
        },
        { status: 503 }
      );
    }

    const body = await req.json();
    const prompt =
      typeof body?.prompt === "string" ? body.prompt.trim() : "";

    if (!prompt) {
      return NextResponse.json(
        { error: "Please describe the image you want OLANIX to create." },
        { status: 400 }
      );
    }

    if (prompt.length > 2000) {
      return NextResponse.json(
        { error: "Please keep your image description under 2,000 characters." },
        { status: 400 }
      );
    }

    const replicate = new Replicate({ auth: token.trim() });
    const output = await replicate.run("black-forest-labs/flux-schnell", {
      input: { prompt },
    });

    const firstOutput = Array.isArray(output) ? output[0] : output;
    const imageUrl =
      firstOutput && typeof firstOutput === "object" &&
      "url" in firstOutput && typeof firstOutput.url === "function"
        ? String(firstOutput.url())
        : typeof firstOutput === "string"
          ? firstOutput
          : "";

    if (!imageUrl || !/^https:\/\//i.test(imageUrl)) {
      console.error("[OLANIX IMAGE] Provider returned an unexpected output.");
      return NextResponse.json(
        { error: "The image service returned an unexpected result. Please try again." },
        { status: 502 }
      );
    }

    return NextResponse.json({
      imageUrl,
      prompt,
      provider: "Replicate FLUX Schnell",
    });
  } catch (error: unknown) {
    console.error(
      "[OLANIX IMAGE GENERATION ERROR]",
      error instanceof Error ? error.message : "Unknown provider error"
    );

    return NextResponse.json(
      {
        error:
          "OLANIX could not generate that image right now. Please check the image-service configuration and try again.",
      },
      { status: 500 }
    );
  }
}
