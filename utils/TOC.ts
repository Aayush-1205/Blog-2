import { useCallback, useEffect, useRef, useState } from "react";

export function useHeadsObserver(): { activeId?: string } {
  const observerRef = useRef<IntersectionObserver | null>(null);
  const [activeId, setActiveId] = useState<string | undefined>("");
  //   const headingsRef = useRef<NodeListOf<HTMLElement>>(null);

  const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        setActiveId(entry.target.id);
      }
    });
  }, []);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(handleObserver, {
      rootMargin: "-10% 0% -60% 0%", // Adjusted for better visibility
      threshold: 0.1, // Trigger when 10% of heading is visible
    });

    const elements =
      document.querySelectorAll<HTMLHeadingElement>("h1, h2, h3");
    // headingsRef.current = elements;

    elements.forEach((element) => {
      if (!element.id) {
        element.id = `heading-${crypto.randomUUID()}`; // Assign ID if missing
      }
      observerRef.current?.observe(element);
    });

    return () => {
      observerRef.current?.disconnect();
    };
  }, [handleObserver]);

  return { activeId };
}

// export function useHeadsObserver(): { activeId: string } {
//   const observer = useRef<IntersectionObserver | null>(null);
//   const [activeId, setActiveId] = useState<string>("");

//   useEffect(() => {
//     const handleObsever: IntersectionObserverCallback = (entries) => {
//       entries.forEach((entry) => {
//         if (entry.isIntersecting) {
//           setActiveId(entry.target.id);
//         }
//       });
//     };

//     observer.current = new IntersectionObserver(handleObsever, {
//       rootMargin: "-10% 0% -60% 0%", // Adjusted for better visibility
//       threshold: 0.1, // Trigger when 10% of heading is visible
//     });

//     const elements: NodeList = document.querySelectorAll("h1,h2, h3");

//     // Correct way to iterate and type:
//     elements.forEach((node) => {
//       // Iterate over Nodes
//       if (node instanceof Element) {
//         // Check if it's an Element
//         observer.current?.observe(node); // Now observe the Node (which is also an Element)
//       }
//     });

//     return () => observer.current?.disconnect();
//   }, []);

//   return { activeId };
// }
