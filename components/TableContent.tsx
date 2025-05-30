"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { useHeadsObserver } from "@/utils/TOC";

interface Heading {
  id: string;
  text: string;
  level: number;
}

const TableContent = () => {
  const [headings, setHeadings] = useState<Heading[]>([]);
  const { activeId } = useHeadsObserver();
  const observerRef = useRef<MutationObserver | null>(null);

  // Generate headings
  const generateHeadings = useCallback(() => {
    const elements = Array.from(
      document.querySelectorAll<HTMLHeadingElement>("h1, h2, h3")
    )
      .filter((elem) => elem.textContent && elem.textContent.trim() !== "")
      .map((elem) => ({
        id: elem.id,
        text: elem.textContent!.trim(),
        level: parseInt(elem.tagName.slice(1)),
      }));

    // Only update state if headings have changed to prevent unnecessary re-renders
    setHeadings((prevHeadings) => {
      if (JSON.stringify(prevHeadings) !== JSON.stringify(elements)) {
        return elements;
      }
      return prevHeadings;
    });
  }, []);

  useEffect(() => {
    // Initial generation of headings
    generateHeadings();

    // Set up MutationObserver to monitor DOM changes
    observerRef.current = new MutationObserver((mutations) => {
      // Only regenerate headings if relevant changes occur
      const hasRelevantChange = mutations.some((mutation) => {
        return (
          (mutation.type === "childList" &&
            Array.from(mutation.addedNodes).some((node) =>
              node.nodeName.match(/^H[1-3]$/)
            )) ||
          Array.from(mutation.removedNodes).some((node) =>
            node.nodeName.match(/^H[1-3]$/)
          )
        );
      });

      if (hasRelevantChange) {
        generateHeadings();
      }
    });

    // Observe only the relevant part of the DOM (e.g., main content area)
    const targetNode = document.querySelector("main") || document.body;
    observerRef.current.observe(targetNode, { childList: true, subtree: true });

    // Cleanup observer on component unmount
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [generateHeadings]);

  // Smooth scroll to heading
  const scrollTo = useCallback((id: string) => {
    const element = document.getElementById(id);
    // console.log("Scroll to element", element?.id);
    if (element) {
      const headerOffset =
        5 * parseFloat(getComputedStyle(document.documentElement).fontSize); // 5rem
      const elementPosition =
        element.getBoundingClientRect().top + window.scrollY;
      const offsetPosition = elementPosition - headerOffset;

      window.scrollTo({
        top: offsetPosition,
        behavior: "smooth",
      });

      // Update the URL hash without reloading the page
    //   history.replaceState(null, "", `#${id}`);
    }
  }, []);

  return (
    <div className="max-w-xs w-full bg-white rounded-lg shadow-lg border border-gray-200 p-4">
      <details open className="w-full">
        <summary
          className="text-lg font-semibold text-[#7B00D3] cursor-pointer flex items-center justify-between"
          aria-label="Toggle Table of Contents"
        >
          Table of Contents
        </summary>
        {headings.length > 0 ? (
          <ul className="mt-4 space-y-2 list-none pl-0 max-h-96 overflow-y-auto">
            {headings.map((heading) => (
              <li
                key={heading.id}
                className={cn(
                  "pl-0 transition-all duration-200",
                  heading.level === 2 && "ml-4",
                  heading.level === 3 && "ml-8"
                )}
              >
                <Link
                  href={`#${heading.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    scrollTo(heading.id);
                  }}
                  className={cn(
                    "block text-sm font-medium transition-colors duration-300",
                    activeId === heading.id
                      ? "text-[#7B00D3] font-semibold bg-[#7B00D3]/10 px-2 py-1 rounded-md"
                      : "text-gray-700 hover:text-[#7B00D3] hover:bg-[#7B00D3]/5 px-2 py-1 rounded-md"
                  )}
                  aria-current={activeId === heading.id ? "true" : "false"}
                >
                  {heading.text}
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-gray-500">No headings found.</p>
        )}
      </details>
    </div>
  );
};

export default TableContent;
