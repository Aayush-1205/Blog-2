"use client";

import Image from "next/image";
import Link from "next/link";
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Scrollbar } from "swiper/modules";
import { format } from "date-fns";
import "swiper/css";
import "swiper/css/scrollbar";
import { Blog } from "@/generated/prisma";

// Fallback component for empty or loading state
const SwiperFallback = () => (
  <div className="h-[70vh] md:h-[87vh] min-[1500px]:h-[40rem] w-[97vw] min-[1500px]:w-full mx-auto rounded-3xl bg-gray-200 flex items-center justify-center">
    <p className="text-gray-500 text-lg">No blogs available</p>
  </div>
);

const BlogSwiper = ({ blog }: { blog: Blog[] }) => {
  if (!blog.length) return <SwiperFallback />;

  return (
    <div>
      <Swiper
        spaceBetween={30}
        centeredSlides={true}
        grabCursor={true}
        autoplay={{
          delay: 5500,
          disableOnInteraction: true,
        }}
        scrollbar={{ draggable: true }}
        modules={[Autoplay, Scrollbar]}
        className="h-[70vh] w-[97vw] md:h-[87vh] mx-auto rounded-3xl min-[1500px]:max-w-screen-2xl min-[1500px]:mx-auto min-[1500px]:h-[40rem] min-[1500px]:w-full"
        role="region"
        aria-label="Featured blogs carousel"
      >
        {blog.map((b) => (
          <SwiperSlide key={b.id} className="w-full h-full">
            <article className="w-full h-full group relative">
              <Link
                href={`/blog/${b.slug}`}
                className="absolute top-0 left-0 bottom-0 right-0 h-full bg-gradient-to-b from-transparent from-0% via-black/60 to-black/80 rounded-3xl z-0"
                aria-label={`Read ${b.title}`}
              />

              <Image
                src={b.bannerUrl}
                placeholder="blur"
                blurDataURL={b.bannerUrl}
                alt={b.title || "Blog cover image"}
                width={500}
                height={500}
                loading="lazy"
                className="w-full h-full object-cover object-center rounded-3xl -z-10"
              />

              <div className="absolute bottom-4 md:bottom-8 z-10 left-4 lg:left-8 text-white w-[95%]">
                <div className="md:space-y-2">
                  <Link
                    href={`/blog/${b.slug}`}
                    className="text-3xl md:text-4xl font-semibold"
                  >
                    <span className="bg-gradient-to-r from-[#7B00D3] to-[#7B00D3] bg-[length:0px_6px] group-hover:bg-[length:100%_6px] bg-left-bottom bg-no-repeat transition-[background-size] duration-500">
                      {b.title || "Untitled Blog"}
                    </span>
                  </Link>
                  <h4 className="text-sm line-clamp-2">
                    {b.subTitle || "No description available"}
                  </h4>
                </div>

                <div className="mt-3 md:mt-6 flex flex-col gap-2 md:gap-0 md:flex-row md:items-center justify-between">
                  <div className="md:space-y-2">
                    <h4 className="text-xs">Published on</h4>
                    <p className="text-xs">
                      {b.createdAt
                        ? format(new Date(b.createdAt), "MMMM dd, yyyy")
                        : "No Date"}
                    </p>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="space-y-2">
                      <h4 className="text-sm">Tags:</h4>
                      <div className="flex items-center gap-1">
                        {b.tags.slice(0, 2).map((t, i) => (
                          <Link
                            href={`/tag/${t.toLowerCase()}`}
                            key={i}
                            className="px-2 py-0.5 sm:px-4 sm:py-1 border border-white rounded-full bg-white/30 backdrop-blur-sm text-[11px] sm:text-xs hover:bg-[#7B00D3] hover:border-[#7B00D3] hover:text-white transition-colors"
                            aria-label={`Filter by tag ${t.replace("_", " ")}`}
                          >
                            {t.replace("_", " ")}
                          </Link>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <h4 className="text-sm">Topics:</h4>
                      <div className="flex items-center gap-1">
                        {b.topics.slice(0, 2).map((t, i) => (
                          <Link
                            href={`/topic/${t.toLowerCase()}`}
                            key={i}
                            className="px-2 py-0.5 sm:px-4 sm:py-1 border border-white rounded-full bg-white/30 backdrop-blur-sm text-[11px] sm:text-xs hover:bg-[#7B00D3] hover:border-[#7B00D3] hover:text-white transition-colors"
                            aria-label={`Filter by topic ${t.replace(
                              "_",
                              " "
                            )}`}
                          >
                            {t.replace("_", " ")}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          </SwiperSlide>
        ))}
      </Swiper>
    </div>
  );
};

export default BlogSwiper;
