import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, Plus, Edit2, Trash2 } from 'lucide-react';
import axios from 'axios';
import { PageHeader } from '../../../components/common/PageHeader';
import { Card, CardContent } from '../../../components/common/Card';
import { Button } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/common/EmptyState';
import { Badge } from '../../../components/ui/Badge';
import { CardSkeleton } from '../../../components/common/CardSkeleton';

const HolidayCalendars = () => {
  const [calendars, setCalendars] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userPermissions = user.permissions || [];
  const hasPermission = (perm) => userPermissions.includes('*') || userPermissions.includes(perm);

  const fetchCalendars = async () => {
    setIsLoading(true);
    try {
      const { data } = await axios.get('/api/v1/hr/holiday-calendars', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setCalendars(data);
    } catch (error) {
      console.error('Failed to fetch holiday calendars', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendars();
  }, []);

  return (
    <div className="animate-in fade-in zoom-in-95 duration-300 space-y-6">
      <PageHeader 
        title={
          <div className="flex items-center gap-2">
            <CalendarDays className="text-primary h-8 w-8" /> 
            Holiday Calendars
          </div>
        }
        description="Manage company and regional holiday calendars."
        actions={
          hasPermission('HOLIDAY.CALENDAR.CREATE') && (
            <Button onClick={() => navigate('/holiday-calendars/new')} leftIcon={<Plus size={18} />}>
              New Calendar
            </Button>
          )
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : calendars.length === 0 ? (
        <EmptyState 
          icon={<CalendarDays className="h-10 w-10 opacity-70" />}
          title="No holiday calendars found"
          description="Create your first holiday calendar to get started."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {calendars.map(calendar => (
            <Card key={calendar._id} className="relative group overflow-hidden hover:shadow-md transition-shadow">
              <div className={`absolute top-0 left-0 w-1 h-full ${calendar.status === 'ACTIVE' ? 'bg-green-500' : 'bg-muted'}`}></div>
              <CardContent className="p-5">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-lg font-bold text-foreground">{calendar.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider">Year: {calendar.year}</Badge>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {hasPermission('HOLIDAY.VIEW') && (
                      <button 
                        onClick={() => navigate(`/holiday-calendars/${calendar._id}`)}
                        className="p-1.5 text-primary hover:bg-primary/10 rounded-md transition-colors"
                        title="View Holidays"
                      >
                        <CalendarDays size={14} />
                      </button>
                    )}
                    {hasPermission('HOLIDAY.CALENDAR.EDIT') && (
                      <button 
                        onClick={() => navigate(`/holiday-calendars/edit/${calendar._id}`)}
                        className="p-1.5 text-muted-foreground hover:text-primary bg-muted/50 hover:bg-primary/10 rounded-md transition-colors"
                      >
                        <Edit2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
                
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2 min-h-[40px]">
                  {calendar.description || 'No description provided.'}
                </p>

                <div className="space-y-2 text-sm bg-muted/30 p-3 rounded-lg">
                  <div className="flex justify-between">
                     <span className="text-muted-foreground font-medium">Branches</span>
                     <span className="font-bold">{calendar.applicableBranches?.length || 'All'}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default HolidayCalendars;
