
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

    // Delete expired stories
    const { data: expiredStories, error: fetchError } = await supabase
      .from('stories')
      .select('image_url, photo_urls')
      .lt('expires_at', new Date().toISOString())

    if (fetchError) {
      console.error('Error fetching expired stories:', fetchError)
      throw fetchError
    }

    if (expiredStories && expiredStories.length > 0) {
      // Delete images from storage
      for (const story of expiredStories) {
        try {
          // Handle single image (backward compatibility)
          if (story.image_url) {
            const url = new URL(story.image_url)
            const path = url.pathname.split('/').slice(-2).join('/') // Get the file path
            
            await supabase.storage
              .from('stories')
              .remove([path])
          }

          // Handle multiple photos
          if (story.photo_urls && Array.isArray(story.photo_urls)) {
            for (const photoUrl of story.photo_urls) {
              try {
                const url = new URL(photoUrl)
                const path = url.pathname.split('/').slice(-2).join('/') // Get the file path
                
                await supabase.storage
                  .from('stories')
                  .remove([path])
              } catch (error) {
                console.error('Error deleting photo:', error)
              }
            }
          }
        } catch (error) {
          console.error('Error deleting story images:', error)
        }
      }

      // Delete stories from database
      const { error: deleteError } = await supabase
        .from('stories')
        .delete()
        .lt('expires_at', new Date().toISOString())

      if (deleteError) {
        console.error('Error deleting expired stories:', deleteError)
        throw deleteError
      }

      console.log(`Cleaned up ${expiredStories.length} expired stories`)
    }

    return new Response(
      JSON.stringify({ 
        message: `Cleaned up ${expiredStories?.length || 0} expired stories` 
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
