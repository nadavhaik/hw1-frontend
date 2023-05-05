import React, { ChangeEvent, FormEvent, useState } from "react";
import type { GetServerSideProps } from "next";
import Layout from "../components/Layout";
import Post, { PostProps } from "../components/Post";
import prisma from '../lib/prisma'
import Link from "next/link";
import {useRouter} from "next/router";
import { getSession } from 'next-auth/react'


type Nullable<T> = T | null;

type Post = {
  id: number,
  title: string,
  published: boolean,
  author: Nullable<{name: Nullable<string>}>,
  authorId: Nullable<number>,
  content: Nullable<string>
}


const postsPerPage = 10;
export const getServerSideProps: GetServerSideProps = async (context) => {
  const query = context.query;
  const page = query.hasOwnProperty('page') && query.page !== undefined ? query.page : '1';
  if(Array.isArray(page))
    return {props: []};
  const req = context.req;

  const session = await getSession({req});
  const pageIndex = parseInt(page);


  const getCurrentAuthorId = async (): Promise<number> => {
    if(session === null ||
      session.user === null || session.user === undefined) 
      return -1;
    const email = session.user.email;
    if(email === null || email === undefined) return -1;
    const user = await prisma.user.findFirst({
      where: {
        email: email
      }
    });

    if(user === null || user === undefined)
      return -1;
    
    return user.id;
  } 


  const currentUserId = await getCurrentAuthorId();

  const feed = await prisma.$queryRaw<{id: number}[]>`SELECT id FROM Post where id >
  (
    SELECT COALESCE(max(id), -1) from 
    (
      SELECT id from Post
      WHERE published = 1
      OR authorId = ${currentUserId}
      ORDER BY id
      LIMIT ${postsPerPage * (pageIndex - 1)}
    )	
  )
  AND (published = 1 OR authorId = ${currentUserId})
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

  const totalPages = Math.ceil(await prisma.post.count({
    where: { OR: [
      {published: true},
      {authorId: {equals: currentUserId}}
    ]
  }}) / postsPerPage);


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
  const router = useRouter();
  const [pageInNavbar,  setPageInNavBar] = useState(props.page);

  const setPageInNavBarIfValid = (pageNumberElement: ChangeEvent<HTMLInputElement>): void => {
    const page = parseInt(pageNumberElement.currentTarget.value);
    if(page < 1 || page > props.totalPages)
      return;
    setPageInNavBar(page);
  }

  const urlOfPage = (page: number) => `/?page=${page}`;

  function nextPage() {
    if(props.page === props.totalPages) {
      return <span>Next</span>
    }
    return <Link href={urlOfPage(props.page+1)} onClick={()=>setPageInNavBar(props.page+1)}>  Next</Link>
  } 
  function previousPage() {
    if(props.page === 1) {
      return <span>Previous</span>
    }
    return <Link href={urlOfPage(props.page-1)} onClick={()=>setPageInNavBar(props.page-1)}>Previous  </Link>
  }

  function gotoPageInNavbar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    router.push(urlOfPage(pageInNavbar));
  }

  const navigationButtons = <React.Fragment>

    <form onSubmit={gotoPageInNavbar}>
      <input type='submit' value='Jump to'></input>
      <input type='number' className='page-selector' value={pageInNavbar} onChange={setPageInNavBarIfValid} size={2}></input>
    </form>
    {previousPage()}
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

        .page-selector {
          width: 10px
        }
        
      `}</style>
    </Layout>
  );
};

export default Blog;
