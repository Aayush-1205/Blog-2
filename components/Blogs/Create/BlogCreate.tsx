"use client";

import { Tags, Topics } from "@/generated/prisma";
import { useEffect, useState } from "react";
import BlogInputs from "./BlogInputs";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import { Light as SyntaxHighlighter } from "react-syntax-highlighter";
import { a11yDark } from "react-syntax-highlighter/dist/esm/styles/hljs";
import remarkGfm from "remark-gfm";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import { IoCopy, IoCopyOutline } from "react-icons/io5";

const BlogCreate = () => {
  const [formData, setFormData] = useState({
    title: "",
    subTitle: "",
    slug: "",
    content: "",
    bannerUrl: "",
    video: "",
    tags: [] as Tags[],
    topics: [] as Topics[],
  });
  const [isLoading, setIsLoading] = useState(false);
  const [topicsQuery, setTopicsQuery] = useState<string>("");
  const [tagsQuery, setTagsQuery] = useState<string>("");

  // Effect to check localStorage when component mounts
  useEffect(() => {
    const storedData = localStorage.getItem("blogDraft");

    if (storedData) {
      // If data exists, parse it and set the form data
      setFormData(JSON.parse(storedData));
    }
  }, []); // Empty dependency array so this runs only on mount

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

    const [copied, setCopied] = useState<boolean>();
    // copy code
    const copyCode = (text: string) => {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    };

    if (inline) {
      return <code>{children}</code>;
    } else if (match) {
      return (
        <div style={{ position: "relative" }}>
          <SyntaxHighlighter
            style={a11yDark}
            language="typescript"
            showLineNumbers={true}
            PreTag="pre"
            {...props}
            codeTagProps={{
              style: {
                padding: "0",
                borderRadius: "5px",
                overflowX: "auto",
                whiteSpace: "pre-wrap",
              },
            }}
          >
            {String(children).replace(/\n$/, "")}
          </SyntaxHighlighter>
          <button
            className={`absolute top-0 right-0 z-10 ${
              copied ? "text-[#3d3d3d] bg-white" : "bg-[#3d3d3d] text-white"
            } p-3 rounded-bl-xl rounded-tr-xl`}
            onClick={() => copyCode(String(children).replace(/\n$/, ""))}
          >
            {copied ? <IoCopyOutline /> : <IoCopy />}
          </button>
        </div>
      );
    } else {
      return (
        <code className="md-post-code" {...props}>
          {children}
        </code>
      );
    }
  };

  return (
    <>
      <div className="max-w-4xl mx-auto p-4">
        <h1 className="text-3xl font-bold mb-4">Create New Blog</h1>

        <BlogInputs
          formData={formData}
          isLoading={isLoading}
          setFormData={setFormData}
          setIsLoading={setIsLoading}
          tagsQuery={tagsQuery}
          setTagsQuery={setTagsQuery}
          topicsQuery={topicsQuery}
          setTopicsQuery={setTopicsQuery}
        />
      </div>

      <details className="mt-12 mb-4 px-8 w-full h-full marker:hidden">
        <summary className="text-accent cursor-pointer">Preview</summary>

        <div className="w-full grid lg:grid-cols-3 gap-4 mt-4">
          <div className="group col-span-1 h-96 flex flex-col items-center">
            {/* <div className="h-full rounded-xl overflow-hidden">
              <Image
                src={formData.bannerUrl}
                // placeholder="blur"
                // blurDataURL={formData.bannerUrl}
                alt={formData.title || "Blog - Image"}
                width={500}
                height={500}
                className="aspect-[4/3] w-full max-h-96 object-cover object-center group-hover:scale-105 transition-all ease duration-300 relative"
                // sizes="(max-width: 640px) 100vw,(max-width: 1024px) 50vw, 33vw"
              />
            </div> */}

            <div className="flex flex-col w-full mt-4 text-wrap">
              <div className="flex items-center gap-2">
                <p className="uppercase px-3 py-0.5 border border-accent rounded-full text-accent text-xs">
                  {formData.topics[0]}
                </p>
                <hr className="bg-gray w-[1px] h-4" />
                <p className="uppercase px-3 py-0.5 border border-accent rounded-full text-accent text-xs">
                  {formData.tags[0]}
                </p>
              </div>
              <div className="inline-block my-1">
                <h2 className="font-semibold capitalize text-base sm:text-lg">
                  {formData.title ||
                    "Design in the age of AI: How to adapt lazily."}
                </h2>
                <p className="line-clamp-2 text-xs">
                  {formData.subTitle ||
                    "With slothUI, you can unleash your inner Gen Z and just stop caring about anything else."}
                </p>
              </div>
            </div>
          </div>

          <div className="col-span-2 w-full h-full">
            <p className="text-gray-500 mt-4 pr-8 text-[0.9rem]">
              {formData?.subTitle}
            </p>

            {/* Video Player if the blog have one */}
            {formData?.video && (
              <video
                width={1000}
                height={500}
                controls
                className="rounded-lg mt-4 h-96"
              >
                <source src={formData?.video} type="video/mp4" />
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
                  <p className="text-gray-800 my-2 leading-relaxed">
                    {children}
                  </p>
                ),
                h1: ({ children }) => (
                  <h1 className="text-3xl font-bold py-3">{children}</h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-2xl font-semibold py-2">{children}</h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-xl font-semibold py-2">{children}</h3>
                ),
                h4: ({ children }) => (
                  <h4 className="text-lg font-medium py-1">{children}</h4>
                ),
                h5: ({ children }) => (
                  <h5 className="text-base font-medium py-1">{children}</h5>
                ),
                h6: ({ children }) => (
                  <h6 className="text-sm font-medium py-1">{children}</h6>
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
              {formData?.content}
            </ReactMarkdown>
          </div>
        </div>
      </details>
    </>
  );
};

export default BlogCreate;
