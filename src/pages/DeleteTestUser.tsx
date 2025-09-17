import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const DeleteTestUser = () => {
  const [email, setEmail] = useState('cuertest@gmail.com');
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteUser = async () => {
    if (!email) {
      toast.error('Please enter an email address');
      return;
    }

    if (!email.includes('test')) {
      toast.error('This function only works for test accounts');
      return;
    }

    setIsDeleting(true);
    
    try {
      console.log('Deleting test user:', email);
      
      const { data, error } = await supabase.functions.invoke('delete-test-user', {
        body: { email }
      });

      if (error) {
        console.error('Error deleting test user:', error);
        toast.error(`Failed to delete user: ${error.message}`);
        return;
      }

      console.log('Delete result:', data);
      toast.success(`Successfully deleted user: ${email}`);
      
    } catch (error) {
      console.error('Failed to delete test user:', error);
      toast.error(`Failed to delete user: ${error}`);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="container mx-auto p-8 max-w-md">
      <Card>
        <CardHeader>
          <CardTitle>Delete Test User</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium">Email Address</label>
            <Input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter test user email"
              type="email"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Only test accounts (containing 'test') can be deleted
            </p>
          </div>
          
          <Button 
            onClick={handleDeleteUser}
            disabled={isDeleting || !email}
            className="w-full"
            variant="destructive"
          >
            {isDeleting ? 'Deleting...' : 'Delete Test User'}
          </Button>
          
          <div className="text-xs text-muted-foreground">
            <p>This will:</p>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>Clean up all database references</li>
              <li>Remove user from teams</li>
              <li>Delete user's rundowns and blueprints</li>
              <li>Delete user from authentication</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DeleteTestUser;