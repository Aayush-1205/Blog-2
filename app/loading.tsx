"use client";
import Image from "next/image";
import { motion } from "framer-motion";

const Loading = () => {
  return (
    <div className="w-full min-h-[85vh] h-full mx-auto flex flex-col gap-8 items-center justify-center">
      <div className="flex justify-center items-center">
        <motion.div
          animate={{
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            repeatType: "loop",
          }}
          className="size-24 shadow-xl rounded-full"
        >
          <Image
            src={`/logo.png`}
            alt="Logo Loading..."
            width={500}
            height={500}
            className="object-cover drop-shadow-xl"
          />
        </motion.div>
      </div>
    </div>
  );
};

export default Loading;