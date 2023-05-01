import React, { useState } from "react";
import type { GetServerSideProps } from "next";
import Layout from "../components/Layout";
import Post, { PostProps } from "../components/Post";
import prisma from '../lib/prisma'
import { type } from "os";
import Link from "next/link";

const Pagination = ({ items,        pageSize,         currentPage,         onPageChange }: 
                    {items: number, pageSize: number, currentPage: number, onPageChange: (page: number) => void}) => {
  const pagesCount = Math.ceil(items / pageSize); // 100/10
 
  if (pagesCount === 1) return null;
  const pages = Array.from({ length: pagesCount }, (_, i) => i + 1);
 console.log(pages)
 
  return (
    <div>
      <div>Pagination</div>
    </div>
  );
 };


type Nullable<T> = T | null;

type Posts = {
  id: number,
  title: string,
  published: boolean,
  author: Nullable<{name: Nullable<string>}>,
  authorId: Nullable<number>,
  content: Nullable<string>
}[]

type Post = {
  id: number,
  title: string,
  published: boolean,
  author: Nullable<{name: Nullable<string>}>,
  authorId: Nullable<number>,
  content: Nullable<string>
}


const postsPerPage = 10;


export const getServerSideProps: GetServerSideProps = async ({ query: { page = '1' } }) => {
  if(Array.isArray(page))
    return {props: []};

  const pageIndex = parseInt(page);

  const feed = await prisma.$queryRaw<{id: number}[]>`SELECT id FROM Post where id >
  (
    SELECT COALESCE(max(id), -1) from 
    (
      SELECT id from Post
      WHERE published = 1
      ORDER BY id
      LIMIT ${postsPerPage * (pageIndex - 1)}
    )	
  )
  AND published = 1
  LIMIT ${postsPerPage}`
  .then(ids => 
    prisma.post.findMany({
      where: {
        id: {in: ids.map(id => id.id)}
      },
      include: {
        author: {
          select: {
            name: true,
          },
        },
      },
    })
  );

  var totalPages = await prisma.post.count({
    where: {published: true}
  }) / postsPerPage;


  const flooredTotalPages = Math.floor(totalPages);

  if(totalPages > flooredTotalPages) {
    totalPages = flooredTotalPages + 1;
  }

  return {
    props: { feed, page: pageIndex, totalPages }
  }

}


type Props = {
  page: number;
  feed: PostProps[];
  totalPages: number;
};



const Blog: React.FC<Props> = (props) => {
  function nextPage() {
    if(props.page === props.totalPages) {
      return <span>Next</span>
    }
    return <Link href={`/?page=${props.page+1}`}>Next</Link>
  } 
  function previousPage() {
    if(props.page === 1) {
      return <span>Previous</span>
    }
    return <Link href={`/?page=${props.page-1}`}>Previous</Link>
  }

  const navigationButtons = <React.Fragment>
  {previousPage()}
  <span> </span>
  <span> </span>
  <span> </span>
  {nextPage()}    
  </React.Fragment>;


  return (
    <Layout>
      <div className="page">
        <h1>Public Feed</h1>
        <h2>Page {props.page} / {props.totalPages}</h2>
        {navigationButtons}
        <main>
          {props.feed.map((post) => (
            <div key={post.id} className="post">
              <Post post={post} />
            </div>
          ))}
        </main>
        {navigationButtons}
      </div>
      <style jsx>{`
        .post {
          background: white;
          transition: box-shadow 0.1s ease-in;
        }

        .post:hover {
          box-shadow: 1px 1px 3px #aaa;
        }

        .post + .post {
          margin-top: 2rem;
        }
        
      `}</style>
    </Layout>
  );
};

export default Blog;
