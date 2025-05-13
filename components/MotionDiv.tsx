"use client";
import { motion } from "framer-motion";

interface Props {
  children: React.ReactNode;
  className: string;
  index: number;
}

const MotionDiv = ({ className, index, children }: Props) => {
  const variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={variants}
      transition={{ duration: 0.5, delay: index * 0.25, ease: "easeInOut" }}
      viewport={{ amount: 0 }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

export default MotionDiv;
