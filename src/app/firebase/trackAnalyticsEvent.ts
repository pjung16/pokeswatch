import {db, auth} from './firebase'
import {collection, addDoc, serverTimestamp} from 'firebase/firestore'

export async function trackAnalyticsEvent(
  eventName: string,
  metadata: Record<string, string> = {}
) {
  const user = auth.currentUser
  if (!user) return

  try {
    const ref = collection(db, 'analytics')

    await addDoc(ref, {
      event: eventName,
      metadata,
      userId: user.uid,
      timestamp: serverTimestamp(),
    })
  } catch (err) {
    console.error('Failed to track analytics event:', err)
  }
}
