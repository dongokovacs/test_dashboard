"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Calendar } from "lucide-react"

interface DatePickerProps {
  onDateSelect: (date: string | null) => void
  selectedDate: string | null
}

export function DatePicker({ onDateSelect, selectedDate }: DatePickerProps) {
  const [availableDates, setAvailableDates] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchDates() {
      try {
        const response = await fetch('/api/test-results/dates')
        if (!response.ok) throw new Error('Failed to fetch dates')
        
        const dates = await response.json()
        setAvailableDates(dates)
      } catch (error) {
        console.error('Error fetching available dates:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchDates()
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5" />
          Test History
        </CardTitle>
        <CardDescription>
          {loading ? "Loading dates..." : `${availableDates.length} test run(s) available`}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-sm text-muted-foreground">Loading...</div>
        ) : availableDates.length === 0 ? (
          <div className="text-sm text-muted-foreground">No historical data available</div>
        ) : (
          <div className="space-y-2">
            <Button
              variant={selectedDate === null ? "default" : "outline"}
              className="w-full justify-start"
              onClick={() => onDateSelect(null)}
            >
              Latest Results
            </Button>
            <div className="border-t pt-2 space-y-1">
              {availableDates.map((date) => (
                <Button
                  key={date}
                  variant={selectedDate === date ? "default" : "outline"}
                  className="w-full justify-start text-sm"
                  onClick={() => onDateSelect(date)}
                >
                  {new Date(date + 'T00:00:00').toLocaleDateString("en-US", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </Button>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
