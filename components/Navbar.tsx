"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState, useCallback, useRef } from "react";
import { useDispatch } from "react-redux";
import { useRouter } from "next/navigation";
import { debounce } from "@/utils/debounce";
import { motion, AnimatePresence } from "framer-motion";
import { FiMenu, FiX } from "react-icons/fi";
import { setSearchActivated } from "@/store/searchSlice";
import SearchBar from "./Blogs/Search/SearchBar";

const Navbar = () => {
  const dispatch = useDispatch();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  // Navigation links
  const navLinks = [
    { href: "/", label: "Home", shortcut: "!" },
    { href: "/blogs", label: "Blogs", shortcut: "@" },
    { href: "/tags", label: "Tags", shortcut: "#" },
    { href: "/topics", label: "Topics", shortcut: "$" },
  ];

  // Debounced navigation handler
  const navigate = useCallback(
    debounce((path: string) => {
      router.push(path);
    }, 300).debounced,
    [router]
  );

  // Keyboard shortcut handler
  const handleKeydown = useCallback(
    (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === "k") {
        event.preventDefault();
        dispatch(setSearchActivated(true));
      } else if (event.shiftKey) {
        const link = navLinks.find((link) => link.shortcut === event.key);
        if (link) {
          event.preventDefault();
          navigate(link.href);
        }
      }
    },
    [dispatch, navigate, navLinks]
  );

  // Toggle mobile menu
  const toggleMobileMenu = () => {
    setIsMobileMenuOpen((prev) => !prev);
  };

  // Close mobile menu on outside click
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (navRef.current && !navRef.current.contains(event.target as Node)) {
        setIsMobileMenuOpen(false);
      }
    };

    if (isMobileMenuOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isMobileMenuOpen]);

  // Add keydown listener
  useEffect(() => {
    window.addEventListener("keydown", handleKeydown);
    return () => {
      window.removeEventListener("keydown", handleKeydown);
    };
  }, [handleKeydown, navigate]);

  // Animation variants for mobile menu
  const menuVariants = {
    hidden: { opacity: 0, y: -20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.3 } },
    exit: { opacity: 0, y: -20, transition: { duration: 0.2 } },
  };

  return (
    <header className="w-full px-4 py-2 sticky top-0 left-0 z-30 flex items-center min-[1500px]:max-w-screen-2xl min-[1500px]:mx-auto">
      <div className="px-4 py-2 w-full flex items-center justify-between border border-black rounded-full bg-white/80 backdrop-blur-sm">
        {/* Logo */}
        <Link href="/" className="select-none" aria-label="Home">
          <Image
            src="/logo.png"
            alt="Logo"
            width={50}
            height={50}
            priority={true}
            className="size-9 md:size-11"
          />
        </Link>

        {/* Desktop Navigation */}
        <nav
          ref={navRef}
          className="font-medium capitalize flex items-center gap-4 md:gap-8 px-4 py-2 text-white bg-black rounded-full select-none"
          aria-label="Main navigation"
        >
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="hover:[text-shadow:_0_2px_3px_rgb(255_255_255_)] text-sm font-medium sm:font-normal sm:text-base"
              aria-label={`${link.label} (Shift+${link.shortcut})`}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
      {/* Search Bar */}
      <SearchBar />
    </header>
  );
};

export default Navbar;
