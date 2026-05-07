use tauri::{State, command};
use crate::core::tasks::scheduler::FmScheduler;
use crate::fs::file::TaskQueued;

#[command]
pub async fn async_copy(
    src: String,
    dest: String,
    force: bool,
    scheduler: State<'_, FmScheduler>,
) -> Result<TaskQueued, String> {
    let id = scheduler
        .submit_copy(src.into(), dest.into(), force)
        .await;
    Ok(TaskQueued { id })
}

#[command]
pub async fn async_move(
    src: String,
    dest: String,
    scheduler: State<'_, FmScheduler>,
) -> Result<TaskQueued, String> {
    let id = scheduler.submit_move(src.into(), dest.into()).await;
    Ok(TaskQueued { id })
}

#[command]
pub async fn async_delete(
    path: String,
    scheduler: State<'_, FmScheduler>,
) -> Result<TaskQueued, String> {
    let id = scheduler.submit_delete(path.into()).await;
    Ok(TaskQueued { id })
}

#[command]
pub async fn async_trash(
    path: String,
    scheduler: State<'_, FmScheduler>,
) -> Result<TaskQueued, String> {
    let id = scheduler.submit_trash(path.into()).await;
    Ok(TaskQueued { id })
}

#[command]
pub async fn async_rename(
    path: String,
    new_name: String,
    scheduler: State<'_, FmScheduler>,
) -> Result<TaskQueued, String> {
    let id = scheduler.submit_rename(path.into(), new_name).await;
    Ok(TaskQueued { id })
}

#[command]
pub async fn async_extract(
    path: String,
    dest: String,
    scheduler: State<'_, FmScheduler>,
) -> Result<TaskQueued, String> {
    let id = scheduler.submit_extract(path.into(), dest.into()).await;
    Ok(TaskQueued { id })
}

#[command]
pub async fn async_extract_here(
    path: String,
    scheduler: State<'_, FmScheduler>,
) -> Result<TaskQueued, String> {
    let id = scheduler.submit_extract_here(path.into()).await;
    Ok(TaskQueued { id })
}
