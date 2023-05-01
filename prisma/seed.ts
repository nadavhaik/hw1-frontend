import { PrismaClient, Prisma, Post } from '@prisma/client'
import { SingleBar, Presets } from 'cli-progress'
import tweets from '../tweets.json'
const nyanProgress = require('nyan-progress')
// import * as nyanProgress from 'nyan-progress'



const prisma = new PrismaClient()

const rangeFrom = (start: number, end: number) => Array.from({length: (end - start)}, (v, k) => k + start);
const range = (end: number) => rangeFrom(0, end);

const userData: Prisma.UserCreateInput[] = [
  {
    name: 'Alice',
    email: 'alice@prisma.io',
    posts: {
      create: [
        {
          title: 'Join the Prisma Slack',
          content: 'https://slack.prisma.io',
          published: true,
        },
      ],
    },
  },
  {
    name: 'Nilu',
    email: 'nilu@prisma.io',
    posts: {
      create: [
        {
          title: 'Follow Prisma on Twitter',
          content: 'https://www.twitter.com/prisma',
          published: true,
        },
      ],
    },
  },
  {
    name: 'Mahmoud',
    email: 'mahmoud@prisma.io',
    posts: {
      create: [
        {
          title: 'Ask a question about Prisma on GitHub',
          content: 'https://www.github.com/prisma/prisma/discussions',
          published: true,
        },
        {
          title: 'Prisma on YouTube',
          content: 'https://pris.ly/youtube',
        },
      ],
    },
  },
]

export type BasicTweet = {
  text: string,
  time: string
};




export type Tweet = {
  title: string,
  content: string,
  published: boolean,
  authorId: number
};

const btToTweet = (bt: BasicTweet, authorId: number): Tweet => ({
  title: `Tweet by @nHaik at ${bt.time}`,
  content: bt.text,
  published: randomElement([false, true]),
  authorId: authorId
});


const getAllTweets = (authorId: number): Tweet[] => tweets.map(bt => btToTweet(bt, authorId));

const randomElement = <T> (array: T[]): T => 
  array[Math.floor(Math.random() * array.length)];


type LoadingBar = "NyanCat" | "SquareBar";

const barType: LoadingBar = "NyanCat";

const numberOfRandomPosts = 100000;
const postsPerBulk = 100;
var nyanBar: any;
var sqruareBar: SingleBar;

function startBar(numberOfRandomPosts: number) {
  if(barType === "NyanCat") {
    nyanBar = nyanProgress();
    nyanBar.start({total: numberOfRandomPosts});
  }
  else {
    sqruareBar = new SingleBar({}, Presets.shades_classic)
    sqruareBar.start(numberOfRandomPosts, 0);
  }
}

function tickBar() {
  if(barType === "NyanCat")
    nyanBar.tick();
  else
    sqruareBar.increment();
}

function stopBar() {
  if(barType === "NyanCat")
    nyanBar.terminate();
  else  {
    sqruareBar.stop();
  }
}


const tweetRandomly = async (userId: number): Promise<void> => {
  const allTweets =  getAllTweets(userId);
  // const loadingBar = new SingleBar({}, Presets.shades_classic);
  // loadingBar.start(numberOfRandomPosts, 0);
  console.log('Tweeting randomly...');
  startBar(numberOfRandomPosts);
  let totalInserted = 0;
  
  

  while(totalInserted < numberOfRandomPosts) {
    const postPromises: Promise<void>[] = [];
    const currentBulkSize = Math.min(postsPerBulk, numberOfRandomPosts - totalInserted);
    await range(currentBulkSize).forEach(async () => {
      try {
        postPromises.push(prisma.post.create({data: randomElement(allTweets)})
        .then(tickBar));
      } catch(e) {
        console.warn('Could not create post - retrying.');
        postPromises.push(prisma.post.create({data: randomElement(allTweets)})
          .then(tickBar));
      }
      totalInserted++;
    })
    await Promise.all(postPromises);
  }
  stopBar();
  // loadingBar.stop();
}

async function main() {
  console.log(`Start seeding ...`)

  for (const u of userData) {
    const user = await prisma.user.create({
      data: u,
      
    })
    console.log(`Created user with id: ${user.id}`)
  }


    const nahab = await prisma.user.create({
      data: {
        name: 'נחב בטוויטר',
        email: 'nadavhb@gmail.com',
        posts: {create: []}
      }
    });
    console.log(`Created nahab with id: ${nahab.id}`)
    await tweetRandomly(nahab.id);
    // console.log(await prisma.post.findMany());
  
  console.log(`Seeding finished.`)
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })
