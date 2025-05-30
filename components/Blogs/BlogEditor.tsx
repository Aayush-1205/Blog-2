"use client";

import React, { useState, useRef } from "react";
import ReactMarkdown from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { tomorrow } from "react-syntax-highlighter/dist/esm/styles/prism";
import remarkGfm from "remark-gfm";
import {
  FaBold,
  FaItalic,
  FaStrikethrough,
  FaListUl,
  FaListOl,
  FaQuoteRight,
  FaLink,
  FaCode,
  FaHeading,
  FaImage,
  FaMinus,
  FaCheckSquare,
} from "react-icons/fa";
import { IoCopy, IoCopyOutline } from "react-icons/io5";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import { Tags, Topics } from "@/generated/prisma";
import { MdFullscreen, MdFullscreenExit } from "react-icons/md";

const ToolbarButton = ({
  icon,
  onClick,
}: {
  icon: React.ReactNode;
  onClick: () => void;
}) => (
  <button
    type="button"
    onClick={onClick}
    className="p-2 text-base hover:bg-gray-200 rounded"
  >
    {icon}
  </button>
);

const tools = [
  { name: "Bold", icon: <FaBold />, action: "****" },
  { name: "Italic", icon: <FaItalic />, action: "*" },
  { name: "Strikethrough", icon: <FaStrikethrough />, action: "~~" },
  { name: "Bullet List", icon: <FaListUl />, action: "- " },
  { name: "Numbered List", icon: <FaListOl />, action: "1. " },
  { name: "Quote", icon: <FaQuoteRight />, action: "> " },
  { name: "Divider", icon: <FaMinus />, action: "\n---\n" },
  { name: "Checkbox", icon: <FaCheckSquare />, action: "- [ ] " },
  { name: "Link", icon: <FaLink />, action: "[text](https://)" },
  { name: "Code Block", icon: <FaCode />, action: "\n``` js\ncode\n```\n" },
  { name: "Image", icon: <FaImage />, action: "![Image](https://)" },
  { name: "H1", icon: <FaHeading />, action: "# " },
  { name: "H2", icon: <FaHeading />, action: "## " },
  { name: "H3", icon: <FaHeading />, action: "### " },
  { name: "H4", icon: <FaHeading />, action: "#### " },
  { name: "H5", icon: <FaHeading />, action: "##### " },
  { name: "H6", icon: <FaHeading />, action: "###### " },
];

interface BlogInputsProps {
  formData: {
    title: string;
    subTitle: string;
    slug: string;
    content: string;
    bannerUrl: string;
    video: string;
    tags: Tags[];
    topics: Topics[];
  };
  setFormData: React.Dispatch<
    React.SetStateAction<{
      title: string;
      subTitle: string;
      slug: string;
      content: string;
      bannerUrl: string;
      video: string;
      tags: Tags[];
      topics: Topics[];
    }>
  >;
}

const BlogEditor: React.FC<BlogInputsProps> = ({ setFormData, formData }) => {
  const [showToolPanel, setShowToolPanel] = useState(false);
  const [selectedTool, setSelectedTool] = useState(0);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [previewEditor, setPreviewEditor] = useState("Both");
  const editorRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    // setMarkdown(value);
    setFormData((prevFormData) => ({ ...prevFormData, content: value }));

    if (value.endsWith("/")) {
      setShowToolPanel(true);
    } else {
      setShowToolPanel(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const { selectionStart, value } = textareaRef.current!;
    const prevChar = value[selectionStart - 1];

    if (e.key === "Enter") {
      const lines = value.split("\n");
      const currentLine = lines[lines.length - 1];

      if (/^\d+\.\s/.test(currentLine)) {
        e.preventDefault();
        insertText(
          `\n${parseInt(currentLine.match(/^(\d+)\./)?.[1] || "0") + 1}. `
        );
      } else if (/^-\s/.test(currentLine)) {
        e.preventDefault();
        insertText("\n- ");
      } else if (currentLine.trim() === "-") {
        e.preventDefault();
        // setMarkdown(value.replace(/\n-$/, ""));
        setFormData((prevFormData) => ({
          ...prevFormData,
          content: value.replace(/\n-$/, ""),
        }));
      }
    }

    if (showToolPanel) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedTool((prev) => (prev + 1) % tools.length);
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedTool((prev) => (prev - 1 + tools.length) % tools.length);
      }
      if (e.key === "Enter") {
        e.preventDefault();
        applyTool(tools[selectedTool].action);
      }
    }

    if (e.key === "Backspace" && prevChar === "/") {
      setShowToolPanel(false);
    }
  };

  const applyTool = (action: string) => {
    if (textareaRef.current) {
      const { selectionStart, selectionEnd, value } = textareaRef.current;
      const newText =
        value.slice(0, selectionStart - 1) + action + value.slice(selectionEnd);
      //   setMarkdown(newText);
      setFormData((prevFormData) => ({
        ...prevFormData,
        content: newText,
      }));
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(
        selectionStart - 1 + action.length,
        selectionStart - 1 + action.length
      );
    }
    setShowToolPanel(false);
  };

  const insertText = (text: string) => {
    if (textareaRef.current) {
      const { selectionStart } = textareaRef.current;
      //   const newText =
      //     markdown.slice(0, selectionStart) +
      //     text +
      //     markdown.slice(selectionStart);
      const newText =
        formData.content.slice(0, selectionStart) +
        text +
        formData.content.slice(selectionStart);
      //   setMarkdown(newText);
      setFormData((prevFormData) => ({
        ...prevFormData,
        content: newText,
      }));
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(
        selectionStart + text.length,
        selectionStart + text.length
      );
    }
  };

  const wrapText = (before: string, after: string = before) => {
    if (textareaRef.current) {
      const { selectionStart, selectionEnd, value } = textareaRef.current;
      const selectedText = value.slice(selectionStart, selectionEnd) || "text";
      const newText =
        value.slice(0, selectionStart) +
        before +
        selectedText +
        after +
        value.slice(selectionEnd);
      //   setMarkdown(newText);
      setFormData((prevFormData) => ({
        ...prevFormData,
        content: newText,
      }));
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(
        selectionStart + before.length,
        selectionEnd + before.length
      );
    }
  };

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
            style={tomorrow}
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

  const handleToggleFullScreen = () => {
    if (!isFullScreen && editorRef.current) {
      // Enter Full-Screen mode
      if ((editorRef.current as HTMLDivElement).requestFullscreen) {
        (editorRef.current as HTMLDivElement).requestFullscreen();
      }
      setIsFullScreen(true);
    } else {
      // Exit Full-Screen mode
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
      setIsFullScreen(false);
    }
  };

  return (
    <div ref={editorRef} className="w-full h-full bg-white">
      <div className="relative flex flex-col space-y-4">
        <div className="flex flex-col gap-2 w-full pt-2 sm:p-2 border rounded">
          <div className="flex items-center gap-1 w-full overflow-x-auto">
            <ToolbarButton icon={<FaBold />} onClick={() => wrapText("**")} />
            <ToolbarButton icon={<FaItalic />} onClick={() => wrapText("*")} />
            <ToolbarButton
              icon={<FaStrikethrough />}
              onClick={() => wrapText("~~")}
            />
            <ToolbarButton
              icon={<FaListUl />}
              onClick={() => insertText("\n- ")}
            />
            <ToolbarButton
              icon={<FaListOl />}
              onClick={() => insertText("\n1. ")}
            />
            <ToolbarButton
              icon={<FaCheckSquare />}
              onClick={() => insertText("\n- [ ] ")}
            />
            <ToolbarButton
              icon={<FaQuoteRight />}
              onClick={() => insertText("\n> ")}
            />
            <ToolbarButton
              icon={<FaMinus />}
              onClick={() => insertText("\n---\n")}
            />
            <ToolbarButton
              icon={<FaLink />}
              onClick={() => wrapText("[", "](https://)")}
            />
            <ToolbarButton
              icon={<FaCode />}
              onClick={() => wrapText("\n``` js\n", "\n```\n")}
            />
            <ToolbarButton
              icon={<FaHeading />}
              onClick={() => insertText("\n# ")}
            />
            <ToolbarButton
              icon={<FaImage />}
              onClick={() => insertText("![Image](https://)")}
            />
            {isFullScreen ? (
              <MdFullscreenExit
                size={22}
                className="cursor-pointer"
                onClick={handleToggleFullScreen}
              />
            ) : (
              <MdFullscreen
                size={22}
                className="cursor-pointer"
                onClick={handleToggleFullScreen}
              />
            )}
          </div>
          <div className="flex items-center bg-gray overflow-hidden w-fit rounded-lg text-white text-sm my-2 ml-2 sm:m-0 [&_button]:px-4 [&_button]:py-1">
            <button
              type="button"
              onClick={() => setPreviewEditor("Both")}
              className={`${previewEditor === "Both" && "bg-black/60"}`}
            >
              Both
            </button>

            <button
              type="button"
              onClick={() => setPreviewEditor("Editor")}
              className={`${previewEditor === "Editor" && "bg-black/60"}`}
            >
              Editor
            </button>

            <button
              type="button"
              onClick={() => setPreviewEditor("Preview")}
              className={`${previewEditor === "Preview" && "bg-black/60"}`}
            >
              Preview
            </button>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 w-full">
          {previewEditor === "Both" ? (
            <>
              <div className="relative w-full">
                <textarea
                  ref={textareaRef}
                  className="w-full h-[500px] p-2 border rounded focus:outline-none"
                  value={formData.content}
                  onChange={handleTextChange}
                  onKeyDown={handleKeyDown}
                />

                {/* Slash Command Tool Panel */}
                {showToolPanel && (
                  <div className="absolute top-12 left-4 bg-white border rounded-md shadow-md w-48 h-96 overflow-y-auto z-10">
                    {tools.map((tool, index) => (
                      <div
                        key={tool.name}
                        className={`p-2 flex items-center cursor-pointer ${
                          selectedTool === index
                            ? "bg-gray-300"
                            : "hover:bg-gray-200"
                        }`}
                        onClick={() => applyTool(tool.action)}
                      >
                        {tool.icon} <span className="ml-2">{tool.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Markdown Preview */}
              <div className="w-full h-[500px] p-2 border rounded overflow-auto bg-gray-50">
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
                      <h2 className="text-2xl font-semibold py-2">
                        {children}
                      </h2>
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
                      <ol className="list-decimal list-inside my-2">
                        {children}
                      </ol>
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
                  {formData.content}
                </ReactMarkdown>
              </div>
            </>
          ) : previewEditor === "Editor" ? (
            <div className="relative w-full">
              <textarea
                ref={textareaRef}
                className="w-full h-[500px] p-2 border rounded focus:outline-none"
                value={formData.content}
                onChange={handleTextChange}
                onKeyDown={handleKeyDown}
              />

              {/* Slash Command Tool Panel */}
              {showToolPanel && (
                <div className="absolute top-12 left-4 bg-white border rounded-md shadow-md w-48 h-96 overflow-y-auto z-10">
                  {tools.map((tool, index) => (
                    <div
                      key={tool.name}
                      className={`p-2 flex items-center cursor-pointer ${
                        selectedTool === index
                          ? "bg-gray-300"
                          : "hover:bg-gray-200"
                      }`}
                      onClick={() => applyTool(tool.action)}
                    >
                      {tool.icon} <span className="ml-2">{tool.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            previewEditor === "Preview" && (
              <div className="w-full h-[500px] p-2 border rounded overflow-auto bg-gray-50">
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
                      <h2 className="text-2xl font-semibold py-2">
                        {children}
                      </h2>
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
                      <ol className="list-decimal list-inside my-2">
                        {children}
                      </ol>
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
                  {formData.content}
                </ReactMarkdown>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
};

export default BlogEditor;
