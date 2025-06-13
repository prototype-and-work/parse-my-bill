import { db } from '@/config/firebase';
import { collection, addDoc, getDocs, query, where, doc, getDoc, setDoc, Timestamp } from 'firebase/firestore';

interface TestData {
  message: string;
  timestamp: Timestamp;
  userId?: string;
}

export async function testWriteToFirestore(userId: string | null): Promise<string | null> {
  console.log('[FirestoreTest] Attempting to write data...');
  console.log('[FirestoreTest] User ID:', userId);
  if (!userId) {
    console.error('[FirestoreTest] Test write failed: User ID is null.');
    alert('Test write failed: User ID is null. Make sure you are logged in.');
    return null;
  }
  
  try {
    const testCollectionRef = collection(db, 'test_collection');
    const docData: TestData = {
      message: 'Hello from Firestore test!',
      timestamp: Timestamp.now(),
      userId: userId,
    };
    const docRef = await addDoc(testCollectionRef, docData);
    console.log('[FirestoreTest] Document written with ID:', docRef.id);
    alert(`Test document written successfully! ID: ${docRef.id}`);
    return docRef.id;
  } catch (error) {
    const typedError = error as Error;
    console.error('[FirestoreTest] Error writing document:', typedError);
    alert(`Error writing test document: ${typedError.message}`);
    return null;
  }
}

export async function testReadFromFirestore(docId: string): Promise<TestData | null> {
  console.log(`[FirestoreTest] Attempting to read document with ID: ${docId}`);
  if (!docId) {
    console.error('[FirestoreTest] Test read failed: Document ID is null.');
    alert('Test read failed: Document ID is null.');
    return null;
  }
  try {
    const docRef = doc(db, 'test_collection', docId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data() as TestData;
      console.log('[FirestoreTest] Document data:', data);
      alert(`Test document read successfully! Message: ${data.message}`);
      return data;
    } else {
      console.log('[FirestoreTest] No such document!');
      alert('Test read failed: No such document found.');
      return null;
    }
  } catch (error) {
    const typedError = error as Error;
    console.error('[FirestoreTest] Error reading document:', typedError);
    alert(`Error reading test document: ${typedError.message}`);
    return null;
  }
}

export async function testQueryFromFirestore(userId: string | null): Promise<TestData[] | null> {
  console.log('[FirestoreTest] Attempting to query data...');
  if (!userId) {
    console.error('[FirestoreTest] Test query failed: User ID is null.');
    alert('Test query failed: User ID is null. Make sure you are logged in.');
    return null;
  }
  try {
    const testCollectionRef = collection(db, 'test_collection');
    const q = query(testCollectionRef, where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    const results: TestData[] = [];
    querySnapshot.forEach((document) => {
      results.push(document.data() as TestData);
    });
    console.log(`[FirestoreTest] Query found ${results.length} documents:`, results);
    alert(`Test query successful! Found ${results.length} documents for your user ID.`);
    return results;
  } catch (error) {
    const typedError = error as Error;
    console.error('[FirestoreTest] Error querying documents:', typedError);
    alert(`Error querying test documents: ${typedError.message}`);
    return null;
  }
}
