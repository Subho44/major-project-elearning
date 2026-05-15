import express from "express";

import multer from "multer";

import fs from "fs";

import path from "path";

import Groq from "groq-sdk";

const router = express.Router();

// STORAGE
const storage =
  multer.diskStorage({

    destination: (
      req,
      file,
      cb
    ) => {

      cb(null, "uploads/");
    },

    filename: (
      req,
      file,
      cb
    ) => {

      cb(
        null,
        Date.now() +
          ".webm"
      );
    },
  });

const upload =
  multer({
    storage,
  });

// GROQ
const groq =
  new Groq({
    apiKey:
      process.env.GROQ_API_KEY,
  });

// ROUTE
router.post(
  "/speech-to-text",

  upload.single("audio"),

  async (req, res) => {

    try {

      if (!req.file) {

        return res.status(400).json({
          success: false,
          message:
            "No audio uploaded",
        });
      }

      console.log(
        "Uploaded File:",
        req.file
      );

      const filePath =
        path.resolve(
          req.file.path
        );

      // TRANSCRIBE
      const transcription =
        await groq.audio.transcriptions.create({

          file:
            fs.createReadStream(
              filePath
            ),

          model:
            "whisper-large-v3-turbo",

          language: "en",

          response_format:
            "verbose_json",

          temperature: 0,
        });

      console.log(
        "TRANSCRIPTION:",
        transcription
      );

      // DELETE FILE
      fs.unlinkSync(
        filePath
      );

      return res.status(200).json({
        success: true,
        text:
          transcription.text ||
          "",
      });

    } catch (error) {

      console.log(
        "Speech Error:",
        error
      );

      if (
        req.file &&
        fs.existsSync(
          req.file.path
        )
      ) {

        fs.unlinkSync(
          req.file.path
        );
      }

      return res.status(500).json({
        success: false,
        message:
          error.message,
      });
    }
  }
);

export default router;