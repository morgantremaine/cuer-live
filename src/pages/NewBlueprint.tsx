
import React, { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useRundownStorage } from '@/hooks/useRundownStorage';
import { useNewBlueprintState } from '@/hooks/useNewBlueprintState';
import { useNewCrewList } from '@/hooks/useNewCrewList';
import { useNewCameraPlot } from '@/hooks/useNewCameraPlot';
import { useNewScratchpadEditor } from '@/hooks/useNewScratchpadEditor';
import { useCrewRowDragDrop } from '@/hooks/useCrewRowDragDrop';
import { useBlueprintRealtimeCollaboration } from '@/hooks/blueprint/useBlueprintRealtimeCollaboration';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import DashboardHeader from '@/components/DashboardHeader';
import BlueprintHeader from '@/components/blueprint/BlueprintHeader';
import BlueprintEmptyState from '@/components/blueprint/BlueprintEmptyState';
import BlueprintListsGrid from '@/components/blueprint/BlueprintListsGrid';

const NewBlueprint = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { savedRundowns, loading } = useRundownStorage();
  
  const rundown = savedRundowns.find(r => r.id === id);
  
  // Core blueprint state
  const blueprintState = useNewBlueprintState(
    id || '',
    rundown?.title || 'Unknown Rundown',
    rundown?.items || []
  );

  // Crew list functionality
  const crewList = useNewCrewList({
    crewMembers: blueprintState.crewData,
    updateCrewData: blueprintState.updateCrewData
  });

  // Camera plot functionality
  const cameraPlot = useNewCameraPlot({
    plots: blueprintState.cameraPlots,
    updateCameraPlots: blueprintState.updateCameraPlots
  });

  // Scratchpad functionality
  const scratchpad = useNewScratchpadEditor({
    notes: blueprintState.notes,
    updateNotes: blueprintState.updateNotes
  });

  // Crew drag and drop
  const crewDragDrop = useCrewRowDragDrop(crewList.reorderMembers);

  // Set up realtime collaboration
  useBlueprintRealtimeCollaboration({
    rundownId: id || null,
    onBlueprintUpdated: (blueprintData) => {
      console.log('Received blueprint update from teammate:', blueprintData);
      window.location.reload();
    },
    enabled: true
  });

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (error) {
      navigate('/login');
    }
  };

  const handleBack = () => {
    navigate('/dashboard');
  };

  if (loading || blueprintState.isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!rundown) {
    return (
      <div className="min-h-screen bg-gray-900">
        <DashboardHeader 
          userEmail={user?.email} 
          onSignOut={handleSignOut} 
          showBackButton={true}
          onBack={handleBack}
        />
        <div className="flex items-center justify-center" style={{ height: 'calc(100vh - 64px)' }}>
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white mb-4">Rundown Not Found</h1>
            <Button onClick={() => navigate('/dashboard')}>
              Return to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Create component mapping for rendering in the correct order
  const componentMap = {
    'crew-list': (
      <div 
        key="crew-list"
        className={`bg-gray-800 rounded-lg p-6 mb-6 ${blueprintState.draggedListId === 'crew-list' ? 'opacity-50' : ''}`}
        draggable
        onDragStart={(e) => blueprintState.handleDragStart(e, 'crew-list')}
        onDragEnter={(e) => {
          e.preventDefault();
          blueprintState.handleDragEnterContainer(e, blueprintState.lists.length + 1 + blueprintState.componentOrder.indexOf('crew-list'));
        }}
        onDragEnd={blueprintState.handleDragEnd}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Crew List</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-2 px-3 text-gray-300 font-medium">Role</th>
                <th className="text-left py-2 px-3 text-gray-300 font-medium">Name</th>
                <th className="text-left py-2 px-3 text-gray-300 font-medium">Phone</th>
                <th className="text-left py-2 px-3 text-gray-300 font-medium">Email</th>
                <th className="text-center py-2 px-3 text-gray-300 font-medium w-16">Actions</th>
              </tr>
            </thead>
            <tbody>
              {crewList.crewMembers.map((member, index) => (
                <tr 
                  key={member.id}
                  className={`border-b border-gray-700/50 hover:bg-gray-700/30 ${
                    crewDragDrop.draggedRowId === member.id ? 'opacity-50' : ''
                  } ${
                    crewDragDrop.dropTargetIndex === index ? 'border-b-2 border-blue-500' : ''
                  }`}
                  draggable
                  onDragStart={(e) => crewDragDrop.handleRowDragStart(e, member.id)}
                  onDragOver={(e) => crewDragDrop.handleRowDragOver(e, index)}
                  onDrop={(e) => crewDragDrop.handleRowDrop(e, index, crewList.crewMembers)}
                  onDragEnd={crewDragDrop.handleRowDragEnd}
                >
                  <td className="py-2 px-3">
                    <input
                      type="text"
                      value={member.role}
                      onChange={(e) => crewList.updateMember(member.id, 'role', e.target.value)}
                      className="w-full bg-transparent text-white border-none outline-none focus:bg-gray-700/50 rounded px-2 py-1"
                      placeholder="Role"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="text"
                      value={member.name}
                      onChange={(e) => crewList.updateMember(member.id, 'name', e.target.value)}
                      className="w-full bg-transparent text-white border-none outline-none focus:bg-gray-700/50 rounded px-2 py-1"
                      placeholder="Name"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="text"
                      value={member.phone}
                      onChange={(e) => crewList.updateMember(member.id, 'phone', e.target.value)}
                      className="w-full bg-transparent text-white border-none outline-none focus:bg-gray-700/50 rounded px-2 py-1"
                      placeholder="Phone"
                    />
                  </td>
                  <td className="py-2 px-3">
                    <input
                      type="text"
                      value={member.email}
                      onChange={(e) => crewList.updateMember(member.id, 'email', e.target.value)}
                      className="w-full bg-transparent text-white border-none outline-none focus:bg-gray-700/50 rounded px-2 py-1"
                      placeholder="Email"
                    />
                  </td>
                  <td className="py-2 px-3 text-center">
                    <Button
                      onClick={() => crewList.deleteRow(member.id)}
                      variant="ghost"
                      size="sm"
                      className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                      disabled={crewList.crewMembers.length <= 1}
                    >
                      ×
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4">
          <Button
            onClick={crewList.addRow}
            variant="outline"
            size="sm"
            className="text-blue-400 border-blue-400 hover:bg-blue-400/10"
          >
            + Add Row
          </Button>
        </div>
      </div>
    ),
    'camera-plot': (
      <div 
        key="camera-plot"
        className={`bg-gray-800 rounded-lg p-6 mb-6 ${blueprintState.draggedListId === 'camera-plot' ? 'opacity-50' : ''}`}
        draggable
        onDragStart={(e) => blueprintState.handleDragStart(e, 'camera-plot')}
        onDragEnter={(e) => {
          e.preventDefault();
          blueprintState.handleDragEnterContainer(e, blueprintState.lists.length + 1 + blueprintState.componentOrder.indexOf('camera-plot'));
        }}
        onDragEnd={blueprintState.handleDragEnd}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Camera Plots</h3>
          <div className="flex gap-2">
            <Button
              onClick={() => cameraPlot.createNewPlot(`Scene ${cameraPlot.plots.length + 1}`)}
              size="sm"
              className="bg-blue-600 hover:bg-blue-700"
            >
              + New Scene
            </Button>
            <Button
              onClick={() => cameraPlot.openPlotEditor(id || '')}
              size="sm"
              variant="outline"
              className="text-blue-400 border-blue-400 hover:bg-blue-400/10"
            >
              Open Editor
            </Button>
          </div>
        </div>
        {cameraPlot.plots.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <p>No camera plots created yet.</p>
            <p className="text-sm">Click "New Scene" to get started.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {cameraPlot.plots.map((plot) => (
              <div key={plot.id} className="bg-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-white">{plot.name}</h4>
                  <div className="flex gap-1">
                    <Button
                      onClick={() => cameraPlot.duplicatePlot(plot.id)}
                      size="sm"
                      variant="ghost"
                      className="text-gray-400 hover:text-white p-1 h-auto"
                    >
                      📋
                    </Button>
                    <Button
                      onClick={() => cameraPlot.deletePlot(plot.id)}
                      size="sm"
                      variant="ghost"
                      className="text-red-400 hover:text-red-300 p-1 h-auto"
                    >
                      🗑️
                    </Button>
                  </div>
                </div>
                <div className="bg-gray-600 rounded aspect-video flex items-center justify-center text-gray-400 text-sm">
                  {plot.elements.length} elements
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    ),
    'scratchpad': (
      <div 
        key="scratchpad"
        className={`bg-gray-800 rounded-lg p-6 mb-6 ${blueprintState.draggedListId === 'scratchpad' ? 'opacity-50' : ''}`}
        draggable
        onDragStart={(e) => blueprintState.handleDragStart(e, 'scratchpad')}
        onDragEnter={(e) => {
          e.preventDefault();
          blueprintState.handleDragEnterContainer(e, blueprintState.lists.length + 1 + blueprintState.componentOrder.indexOf('scratchpad'));
        }}
        onDragEnd={blueprintState.handleDragEnd}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Scratchpad</h3>
          <div className="flex items-center gap-2">
            <Button
              onClick={scratchpad.handleBold}
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-white p-2 h-auto font-bold"
              title="Bold"
            >
              B
            </Button>
            <Button
              onClick={scratchpad.handleItalic}
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-white p-2 h-auto italic"
              title="Italic"
            >
              I
            </Button>
            <Button
              onClick={scratchpad.handleUnderline}
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-white p-2 h-auto underline"
              title="Underline"
            >
              U
            </Button>
            <Button
              onClick={scratchpad.handleBulletList}
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-white p-2 h-auto"
              title="Bullet List"
            >
              •
            </Button>
          </div>
        </div>
        <textarea
          ref={scratchpad.textareaRef}
          value={scratchpad.notes}
          onChange={(e) => scratchpad.handleNotesChange(e.target.value)}
          onFocus={() => scratchpad.setIsEditing(true)}
          onBlur={() => scratchpad.setIsEditing(false)}
          className="w-full h-64 bg-gray-700 text-white border-none outline-none rounded-lg p-4 resize-none font-mono text-sm"
          placeholder="Add your notes here..."
        />
        <div className="flex items-center justify-between mt-2">
          <div className="text-xs text-gray-400">
            {blueprintState.isSaving ? 'Saving...' : 'Auto-saved'}
          </div>
        </div>
      </div>
    )
  };

  return (
    <div className="min-h-screen bg-gray-900">
      <DashboardHeader 
        userEmail={user?.email} 
        onSignOut={handleSignOut} 
        showBackButton={true}
        onBack={handleBack}
      />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <BlueprintHeader
          rundown={rundown}
          showDate={blueprintState.showDate}
          availableColumns={blueprintState.availableColumns}
          onShowDateUpdate={blueprintState.updateShowDate}
          onAddList={blueprintState.addNewList}
          onRefreshAll={blueprintState.refreshAllLists}
        />

        <div 
          data-drop-container
          onDragOver={blueprintState.handleDragOver}
          onDragLeave={blueprintState.handleDragLeave}
          onDrop={blueprintState.handleDrop}
        >
          {blueprintState.lists.length === 0 ? (
            <BlueprintEmptyState
              availableColumns={blueprintState.availableColumns}
              onAddList={blueprintState.addNewList}
            />
          ) : (
            <BlueprintListsGrid
              lists={blueprintState.lists}
              rundownItems={rundown?.items || []}
              draggedListId={blueprintState.draggedListId}
              insertionIndex={blueprintState.insertionIndex}
              onDeleteList={blueprintState.deleteList}
              onRenameList={blueprintState.renameList}
              onUpdateCheckedItems={blueprintState.updateCheckedItems}
              onDragStart={blueprintState.handleDragStart}
              onDragOver={blueprintState.handleDragOver}
              onDragEnterContainer={blueprintState.handleDragEnterContainer}
              onDragLeave={blueprintState.handleDragLeave}
              onDrop={blueprintState.handleDrop}
              onDragEnd={blueprintState.handleDragEnd}
            />
          )}

          {/* Render components in the specified order with insertion lines */}
          {blueprintState.componentOrder.map((componentId, index) => (
            <React.Fragment key={componentId}>
              {/* Insertion line before component */}
              {blueprintState.insertionIndex === blueprintState.lists.length + 1 + index && (
                <div className="h-1 bg-blue-500 rounded-full mb-4 animate-pulse" />
              )}
              {componentMap[componentId as keyof typeof componentMap]}
            </React.Fragment>
          ))}

          {/* Final insertion line */}
          {blueprintState.insertionIndex === blueprintState.lists.length + 1 + blueprintState.componentOrder.length && (
            <div className="h-1 bg-blue-500 rounded-full mb-4 animate-pulse" />
          )}
        </div>
      </div>
    </div>
  );
};

export default NewBlueprint;
