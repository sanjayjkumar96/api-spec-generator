import React, { useEffect, useState } from 'react'
import { Workbox } from 'workbox-window'
import { Download, X, RefreshCw } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed'
    platform: string
  }>
  prompt(): Promise<void>
}

export const PWAInstaller: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showInstallPrompt, setShowInstallPrompt] = useState(false)
  const [showUpdatePrompt, setShowUpdatePrompt] = useState(false)
  const [wb, setWb] = useState<Workbox | null>(null)

  useEffect(() => {
    if ('serviceWorker' in navigator) {
      const workbox = new Workbox('/sw.js')
      setWb(workbox)

      // Show update prompt when new service worker is waiting
      workbox.addEventListener('waiting', () => {
        setShowUpdatePrompt(true)
      })

      // Register service worker
      workbox.register()
    }

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShowInstallPrompt(true)
    }

    // Hide install prompt after successful installation
    const handleAppInstalled = () => {
      setShowInstallPrompt(false)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return

    try {
      await deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice
      
      if (outcome === 'accepted') {
        setShowInstallPrompt(false)
        setDeferredPrompt(null)
      }
    } catch (error) {
      console.error('Error during installation:', error)
    }
  }

  const handleUpdateClick = () => {
    if (!wb) return

    wb.addEventListener('controlling', () => {
      window.location.reload()
    })

    wb.messageSkipWaiting()
    setShowUpdatePrompt(false)
  }

  const dismissInstallPrompt = () => {
    setShowInstallPrompt(false)
    setDeferredPrompt(null)
  }

  const dismissUpdatePrompt = () => {
    setShowUpdatePrompt(false)
  }

  return (
    <>
      {/* Install App Prompt */}
      {showInstallPrompt && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 p-2 bg-primary-100 rounded-lg">
              <Download className="h-5 w-5 text-primary-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-gray-900 mb-1">
                Install SpecGen AI
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                Install the app for a better experience with offline access and push notifications.
              </p>
              <div className="flex space-x-2">
                <button
                  onClick={handleInstallClick}
                  className="btn-primary text-sm py-1.5 px-3"
                >
                  Install
                </button>
                <button
                  onClick={dismissInstallPrompt}
                  className="btn-secondary text-sm py-1.5 px-3"
                >
                  Maybe Later
                </button>
              </div>
            </div>
            <button
              onClick={dismissInstallPrompt}
              className="flex-shrink-0 p-1 hover:bg-gray-100 rounded transition-colors"
            >
              <X className="h-4 w-4 text-gray-400" />
            </button>
          </div>
        </div>
      )}

      {/* App Update Prompt */}
      {showUpdatePrompt && (
        <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-80 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-50">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 p-2 bg-green-100 rounded-lg">
              <RefreshCw className="h-5 w-5 text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-gray-900 mb-1">
                Update Available
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                A new version of SpecGen AI is available. Update now to get the latest features.
              </p>
              <div className="flex space-x-2">
                <button
                  onClick={handleUpdateClick}
                  className="btn-primary text-sm py-1.5 px-3"
                >
                  Update Now
                </button>
                <button
                  onClick={dismissUpdatePrompt}
                  className="btn-secondary text-sm py-1.5 px-3"
                >
                  Later
                </button>
              </div>
            </div>
            <button
              onClick={dismissUpdatePrompt}
              className="flex-shrink-0 p-1 hover:bg-gray-100 rounded transition-colors"
            >
              <X className="h-4 w-4 text-gray-400" />
            </button>
          </div>
        </div>
      )}
    </>
  )
}