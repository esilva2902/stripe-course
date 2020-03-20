
import {COURSES, findLessonsForCourse} from './db-data';

import * as firebase from 'firebase';

var config = {
  // TODO copy-paste here your own config, taken from the Firebase dashboard
  apiKey: "AIzaSyDbPoGQDlNPu5t9UnltPAXHkSLadVa6n30",
  authDomain: "stripe-course-rec.firebaseapp.com",
  databaseURL: "https://stripe-course-rec.firebaseio.com",
  projectId: "stripe-course-rec",
  storageBucket: "stripe-course-rec.appspot.com",
  messagingSenderId: "784837271295",
  appId: "1:784837271295:web:9eb577e77b5023bc4fb6ca"
};

console.log("Uploading data to the database with the following config:\n");

console.log(JSON.stringify(config));

console.log("\n\n\n\nMake sure that this is your own database, so that you have write access to it.\n\n\n");

firebase.initializeApp(config);

const db = firebase.firestore();

async function uploadData() {

  var batch = db.batch();

  const courses = db.collection('courses');


  Object.values(COURSES)
    .sort((c1:any, c2:any) => c1.seqNo - c2.seqNo)
    .forEach(async (course:any) => {

      const newCourse = removeId(course);

      console.log(`Adding course ${course.titles.description}`);

      const courseRef = await courses.add(newCourse);

      const lessons = courseRef.collection("lessons");

      const courseLessons = findLessonsForCourse(course.id);

      console.log(`Adding ${courseLessons.length} lessons to ${course.titles.description}`);

      courseLessons.forEach(async lesson => {

        const newLesson = removeId(lesson);

        await lessons.add(newLesson);

      });

    });

  return batch.commit();
}


function removeId(data:any) {

  const newData: any = {...data};

  delete newData.id;

  return newData;
}


uploadData()
  .then(() => {
    console.log("Writing data, exiting in 10 seconds ...\n\n");

    setTimeout(() => {

      console.log("\n\n\nData Upload Completed.\n\n\n");
      process.exit(0);

    }, 10000);

  })
  .catch(err => {
    console.log("Data upload failed, reason:", err, '\n\n\n');
    process.exit(-1);
  });


