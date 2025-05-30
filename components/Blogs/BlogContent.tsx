"use client";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Light as SyntaxHighlighter } from "react-syntax-highlighter";
import { tomorrowNightBright } from "react-syntax-highlighter/dist/esm/styles/hljs";
import { IoCopy, IoCopyOutline } from "react-icons/io5";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";

// Import required languages explicitly
import ts from "react-syntax-highlighter/dist/esm/languages/hljs/typescript";
import js from "react-syntax-highlighter/dist/esm/languages/hljs/javascript";
import json from "react-syntax-highlighter/dist/esm/languages/hljs/json";
import css from "react-syntax-highlighter/dist/esm/languages/hljs/css";
import html from "react-syntax-highlighter/dist/esm/languages/hljs/xml";
import { Blog } from "@/generated/prisma";
import TableContent from "../TableContent";

// Register languages
SyntaxHighlighter.registerLanguage("typescript", ts);
SyntaxHighlighter.registerLanguage("javascript", js);
SyntaxHighlighter.registerLanguage("json", json);
SyntaxHighlighter.registerLanguage("css", css);
SyntaxHighlighter.registerLanguage("html", html);

const BlogContent = ({ content }: { content: Blog }) => {
  const Code = ({
    inline,
    className,
    children,
    ...props
  }: {
    inline?: boolean;
    className?: string;
    children?: React.ReactNode;
  }) => {
    const match = /language-(\w+)/.exec(className || "");
    const language = match ? match[1] : "plaintext"; // Default to plaintext if language is not detected

    const [copied, setCopied] = useState<boolean>(false);

    const copyCode = (text: string) => {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    };

    if (inline) {
      return (
        <code className="bg-gray-200 px-1 py-0.5 rounded">{children}</code>
      );
    } else if (match) {
      return (
        <div style={{ position: "relative" }} className="my-2">
          <SyntaxHighlighter
            style={tomorrowNightBright}
            language={language}
            showLineNumbers
            PreTag="pre"
            wrapLongLines
            {...props}
            codeTagProps={{
              style: {
                fontSize: "0.95rem",
                padding: "0.2rem",
                borderRadius: "5px",
                overflowX: "auto",
                whiteSpace: "pre-wrap",
                wordWrap: "break-word",
              },
            }}
          >
            {String(children).replace(/\n$/, "")}
          </SyntaxHighlighter>
          <button
            className={`absolute top-2 right-2 z-10 ${
              copied ? "text-[#3d3d3d] bg-white" : "bg-[#3d3d3d] text-white"
            } p-2 rounded-lg`}
            onClick={() => copyCode(String(children).replace(/\n$/, ""))}
          >
            {copied ? <IoCopyOutline /> : <IoCopy />}
          </button>
        </div>
      );
    } else {
      return (
        <code className="text-accent" {...props}>
          {children}
        </code>
      );
    }
  };

  const generateId = (id: string) => {
    return `heading-${id}-${crypto.randomUUID()}`;
  };

  const cleanId = (text: string, replacement = ""): string => {
    // Remove anything starting with '[', '[o', or '[ob'
    const bracketPattern = /\[ob?j?.*?/gi;

    // Remove commas
    const commaPattern = /,/g;

    // First, remove unwanted patterns
    let cleanedText = text
      .replace(bracketPattern, replacement)
      .replace(commaPattern, replacement);

    // Then replace spaces with hyphens
    cleanedText = cleanedText.replace(/\s+/g, "-");

    return generateId(cleanedText);
  };

  return (
    <div className="flex flex-col-reverse lg:flex-row justify-between gap-8 mt-4 w-full">
      <div className="w-full max-w-screen-lg">
        {/* Video Player if the blog has one */}
        {content?.video && (
          <video
            width={1000}
            height={500}
            controls
            className="rounded-lg mt-4 h-96"
          >
            <source src={content?.video} type="video/mp4" />
          </video>
        )}
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[
            rehypeSlug,
            [rehypeAutolinkHeadings, { behavior: "append" }],
          ]}
          components={{
            code: Code,
            p: ({ children }) => (
              <p className="text-gray-800 my-2 leading-relaxed">{children}</p>
            ),
            h1: ({ children }) => (
              <h1
                id={cleanId(children?.toLocaleString().slice(0, 10) as string)}
                className="text-3xl font-bold py-3"
              >
                {children}
              </h1>
            ),
            h2: ({ children }) => (
              <h2
                id={cleanId(children?.toLocaleString().slice(0, 10) as string)}
                className="text-2xl font-semibold py-2"
              >
                {children}
              </h2>
            ),
            h3: ({ children }) => (
              <h3
                id={cleanId(children?.toLocaleString().slice(0, 10) as string)}
                className="text-xl font-semibold py-2"
              >
                {children}
              </h3>
            ),
            h4: ({ children }) => (
              <h4
                id={cleanId(children?.toLocaleString().slice(0, 10) as string)}
                className="text-lg font-medium py-1"
              >
                {children}
              </h4>
            ),
            h5: ({ children }) => (
              <h5
                id={cleanId(children?.toLocaleString().slice(0, 10) as string)}
                className="text-base font-medium py-1"
              >
                {children}
              </h5>
            ),
            h6: ({ children }) => (
              <h6
                id={cleanId(children?.toLocaleString().slice(0, 10) as string)}
                className="text-sm font-medium py-1"
              >
                {children}
              </h6>
            ),
            ul: ({ children }) => (
              <ul className="list-disc list-inside my-2">{children}</ul>
            ),
            ol: ({ children }) => (
              <ol className="list-decimal list-inside my-2">{children}</ol>
            ),
            li: ({ children }) => <li className="py-1">{children}</li>,
            blockquote: ({ children }) => (
              <blockquote className="border-l-4 border-gray-300 pl-4 italic text-gray-600 my-2">
                {children}
              </blockquote>
            ),
            img: ({ src, alt }) => (
              <img
                src={src}
                alt={alt}
                className="w-full sm:max-w-[40vw] rounded-lg mx-auto my-4"
              />
            ),
            hr: () => <hr className="my-6 border-gray-200" />,
          }}
        >
          {content?.content}
        </ReactMarkdown>
      </div>
      <div className="lg:max-w-80 w-full h-full lg:sticky lg:top-24 lg:right-0">
        <TableContent />
      </div>
    </div>
  );
};

export default BlogContent;
