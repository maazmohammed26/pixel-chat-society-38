
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.8'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Use the new cleanup function that handles individual photo expiration
    const { error: cleanupError } = await supabase.rpc('cleanup_expired_story_photos')
    
    if (cleanupError) {
      console.error('Error cleaning up expired story photos:', cleanupError)
      throw cleanupError
    }

    // Also clean up any stories that are past their expires_at time
    const { data: expiredStories, error: fetchError } = await supabase
      .from('stories')
      .select('image_url, photo_urls')
      .lt('expires_at', new Date().toISOString())

    let cleanedUpCount = 0;

    if (expiredStories && expiredStories.length > 0) {
      // Delete images from storage for fully expired stories
      for (const story of expiredStories) {
        try {
          // Delete single image if exists
          if (story.image_url) {
            const url = new URL(story.image_url)
            const path = url.pathname.split('/').slice(-2).join('/')
            await supabase.storage.from('stories').remove([path])
          }

          // Delete multiple photos if they exist
          if (story.photo_urls && Array.isArray(story.photo_urls)) {
            for (const photoUrl of story.photo_urls) {
              try {
                const url = new URL(photoUrl)
                const path = url.pathname.split('/').slice(-2).join('/')
                await supabase.storage.from('stories').remove([path])
              } catch (error) {
                console.error('Error deleting photo:', error)
              }
            }
          }
        } catch (error) {
          console.error('Error deleting story images:', error)
        }
      }

      // Delete expired stories from database
      const { error: deleteError } = await supabase
        .from('stories')
        .delete()
        .lt('expires_at', new Date().toISOString())

      if (deleteError) {
        console.error('Error deleting expired stories:', deleteError)
        throw deleteError
      }

      cleanedUpCount = expiredStories.length
    }

    console.log(`Cleaned up ${cleanedUpCount} fully expired stories and handled individual photo expiration`)

    return new Response(
      JSON.stringify({ 
        message: `Cleaned up ${cleanedUpCount} expired stories and handled photo expiration`,
        success: true
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Error in cleanup function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})
